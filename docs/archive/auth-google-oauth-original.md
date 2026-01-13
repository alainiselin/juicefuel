# Google OAuth Setup for JuiceFuel

This document explains how to configure Google OAuth for JuiceFuel authentication.

## Required Environment Variables

Add these to your `.env` file:

```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret

# Auth configuration (already set)
AUTH_ORIGIN=http://localhost:3000
AUTH_SECRET=your-random-secret-string
```

## Google Cloud Platform (GCP) Configuration

### 1. Create OAuth 2.0 Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select or create a project
3. Navigate to **APIs & Services** > **Credentials**
4. Click **Create Credentials** > **OAuth client ID**
5. Select **Web application** as application type
6. Configure the OAuth consent screen if prompted

### 2. Configure Authorized Redirect URIs

Add these exact redirect URIs in the OAuth client configuration:

**For Local Development:**
```
http://localhost:3000/api/auth/callback/google
```

**For Production:**
```
https://yourdomain.com/api/auth/callback/google
```

**For juicecrew.vip (when deployed):**
```
https://juicecrew.vip/api/auth/callback/google
https://www.juicecrew.vip/api/auth/callback/google
```

### 3. OAuth Consent Screen

Configure the OAuth consent screen with:

- **Application name:** JuiceFuel
- **User support email:** Your support email
- **Developer contact:** Your email
- **Scopes:** Only these are needed:
  - `openid`
  - `email`
  - `profile`

For development, you can use **External** user type with test users.
For production with a Google Workspace domain, you can use **Internal** to restrict to your domain.

### 4. Authorized JavaScript Origins (Optional)

Add these if needed:

```
http://localhost:3000
https://yourdomain.com
https://juicecrew.vip
```

## How It Works

1. User clicks "Continue with Google" on `/login`
2. Browser redirects to `/api/auth/google`
3. Server generates a random `state` token, stores it in an httpOnly cookie, and redirects to Google's consent screen
4. User authorizes the app in Google
5. Google redirects back to `/api/auth/callback/google?code=...&state=...`
6. Server:
   - Validates the `state` parameter matches the cookie (CSRF protection)
   - Exchanges the authorization `code` for an access token
   - Fetches user profile (email, name, picture) from Google
   - Upserts `user_profile` in the database
   - Creates a `Session` record
   - Sets `session_token` httpOnly cookie
   - Redirects to `/plan`

## Manual Testing Steps

### Local Development Test:

1. Ensure `.env` has `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
2. Start the dev server: `npm run dev`
3. Visit `http://localhost:3000/login`
4. Click "Continue with Google"
5. You should be redirected to Google's consent screen
6. After authorizing, you should be redirected back and logged in at `/plan`
7. Check browser cookies: `session_token` should be set
8. Verify in database: `user_profile` and `session` records created

### Production Test:

1. Deploy with production environment variables
2. Update `AUTH_ORIGIN` to your production URL
3. Ensure GCP redirect URI includes production URL
4. Test the same flow as above

## Troubleshooting

### Error: `redirect_uri_mismatch`
- The redirect URI in GCP console must EXACTLY match `${AUTH_ORIGIN}/api/auth/callback/google`
- Check for trailing slashes, http vs https, and exact domain

### Error: `oauth_state`
- State parameter mismatch (CSRF protection)
- This can happen if cookies are blocked or session expires
- Ensure cookies are enabled and try again

### Error: `google_not_configured`
- `GOOGLE_CLIENT_ID` or `GOOGLE_CLIENT_SECRET` not set in environment
- Check `.env` file and restart server

### Error: `no_email`
- Google profile doesn't include email
- Ensure email scope is requested and user grants permission

## Security Notes

- **State parameter:** Protects against CSRF attacks
- **httpOnly cookies:** Prevents XSS attacks from stealing session tokens
- **Secure flag:** Only set in production to ensure cookies only sent over HTTPS
- **Short-lived state cookie:** Expires in 10 minutes
- **Session token:** Uses crypto.randomUUID() for unpredictable tokens
- **Sessions expire:** 30 days, stored in database

## Domain-Specific Configuration (juicecrew.vip)

If you're using a Google Workspace domain:

1. You can restrict OAuth to domain users only via the consent screen settings
2. Use **Internal** user type in OAuth consent screen
3. Users must sign in with `@juicecrew.vip` email addresses
4. No need to add individual test users

For public access with any Google account:

1. Use **External** user type
2. Add any scopes you need
3. Submit for verification if you exceed user limits (usually 100 users)
