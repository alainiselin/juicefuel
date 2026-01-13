import prisma from '../../../utils/prisma';
import { ensureDefaultHouseholdForUser } from '../../../utils/householdBootstrap';

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const query = getQuery(event);
  
  const clientId = config.googleClientId || process.env.GOOGLE_CLIENT_ID;
  const clientSecret = config.googleClientSecret || process.env.GOOGLE_CLIENT_SECRET;
  const authOrigin = config.authOrigin || process.env.AUTH_ORIGIN || 'http://localhost:3000';
  
  if (!clientId || !clientSecret) {
    console.error('Google OAuth not configured');
    return sendRedirect(event, '/login?error=google_not_configured');
  }
  
  // Validate state parameter (CSRF protection)
  const stateCookie = getCookie(event, 'oauth_state');
  const stateParam = query.state as string;
  
  if (!stateCookie || !stateParam || stateCookie !== stateParam) {
    console.error('OAuth state mismatch');
    deleteCookie(event, 'oauth_state');
    return sendRedirect(event, '/login?error=oauth_state');
  }
  
  // Clear state cookie
  deleteCookie(event, 'oauth_state');
  
  // Check for error from Google
  if (query.error) {
    console.error('Google OAuth error:', query.error);
    return sendRedirect(event, '/login?error=oauth_failed');
  }
  
  const code = query.code as string;
  if (!code) {
    console.error('No authorization code received');
    return sendRedirect(event, '/login?error=no_code');
  }
  
  try {
    // Exchange code for tokens
    const redirectUri = `${authOrigin}/api/auth/callback/google`;
    const tokenParams = new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    });
    
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: tokenParams.toString(),
    });
    
    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token exchange failed:', errorText);
      return sendRedirect(event, '/login?error=token_exchange');
    }
    
    const tokens = await tokenResponse.json();
    const accessToken = tokens.access_token;
    
    if (!accessToken) {
      console.error('No access token received');
      return sendRedirect(event, '/login?error=no_token');
    }
    
    // Fetch user profile
    const profileResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    
    if (!profileResponse.ok) {
      console.error('Failed to fetch user profile');
      return sendRedirect(event, '/login?error=profile_fetch');
    }
    
    const profile = await profileResponse.json();
    
    if (!profile.email) {
      console.error('No email in profile');
      return sendRedirect(event, '/login?error=no_email');
    }
    
    // Upsert user_profile
    const user = await prisma.user_profile.upsert({
      where: { email: profile.email },
      update: {
        avatar_url: profile.picture || undefined,
        display_name: profile.name || undefined,
        email_verified: new Date(),
      },
      create: {
        email: profile.email,
        display_name: profile.name || profile.email.split('@')[0],
        avatar_url: profile.picture,
        email_verified: new Date(),
      },
    });
    
    // Optionally create/update Account record if schema supports it
    try {
      await prisma.account.upsert({
        where: {
          provider_provider_account_id: {
            provider: 'google',
            provider_account_id: profile.id,
          },
        },
        update: {
          access_token: accessToken,
        },
        create: {
          user_id: user.id,
          provider: 'google',
          provider_account_id: profile.id,
          access_token: accessToken,
          type: 'oauth',
        },
      });
    } catch (error) {
      // Account table might not exist or might have different structure
      // This is optional, so just log and continue
      console.log('Account record creation skipped:', error instanceof Error ? error.message : 'unknown error');
    }
    
    // Ensure user has a default household
    await ensureDefaultHouseholdForUser(user.id, user.display_name);
    
    // Create session
    const session = await prisma.session.create({
      data: {
        user_id: user.id,
        session_token: crypto.randomUUID(),
        expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      },
    });
    
    // Set session cookie
    setCookie(event, 'session_token', session.session_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60,
      path: '/',
    });
    
    // Redirect to planner
    return sendRedirect(event, '/plan');
    
  } catch (error) {
    console.error('OAuth callback error:', error);
    return sendRedirect(event, '/login?error=oauth_error');
  }
});
