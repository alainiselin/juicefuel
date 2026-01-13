export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  
  const clientId = config.googleClientId || process.env.GOOGLE_CLIENT_ID;
  const authOrigin = config.authOrigin || process.env.AUTH_ORIGIN || 'http://localhost:3000';
  
  if (!clientId) {
    console.error('GOOGLE_CLIENT_ID not configured');
    return sendRedirect(event, '/login?error=google_not_configured');
  }
  
  // Generate random state for CSRF protection
  const state = crypto.randomUUID();
  
  // Store state in short-lived cookie
  setCookie(event, 'oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 minutes
    path: '/',
  });
  
  const redirectUri = `${authOrigin}/api/auth/callback/google`;
  
  const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  googleAuthUrl.searchParams.set('client_id', clientId);
  googleAuthUrl.searchParams.set('redirect_uri', redirectUri);
  googleAuthUrl.searchParams.set('response_type', 'code');
  googleAuthUrl.searchParams.set('scope', 'openid email profile');
  googleAuthUrl.searchParams.set('state', state);
  googleAuthUrl.searchParams.set('access_type', 'online');
  googleAuthUrl.searchParams.set('prompt', 'select_account');
  
  return sendRedirect(event, googleAuthUrl.toString());
});
