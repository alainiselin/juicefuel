# Google OAuth Implementation Summary

## What Was Implemented

Added Google OAuth login functionality to JuiceFuel using our existing session cookie system (NOT next-auth). Users can now sign in with their Google account.

## Files Created

### 1. Server API Endpoints

**`server/api/auth/google.get.ts`**
- Initiates Google OAuth flow
- Generates random `state` token for CSRF protection
- Stores `state` in httpOnly cookie (10-minute expiry)
- Redirects user to Google consent screen with proper scopes (openid, email, profile)

**`server/api/auth/callback/google.get.ts`**
- Handles OAuth callback from Google
- Validates `state` parameter (CSRF protection)
- Exchanges authorization code for access token
- Fetches user profile from Google (email, name, picture)
- Upserts `user_profile` in database
- Optionally creates `Account` record (gracefully fails if table doesn't exist)
- Creates `Session` record with 30-day expiry
- Sets `session_token` httpOnly cookie
- Redirects to `/plan`

### 2. Configuration

**`nuxt.config.ts`**
- Added `runtimeConfig` with server-side secrets:
  - `authSecret`
  - `googleClientId`
  - `googleClientSecret`
  - `authOrigin`
- Exposed `authOrigin` to client via `public` config

### 3. UI Updates

**`app/pages/login.vue`**
- Enabled "Continue with Google" button (always visible)
- Button navigates to `/api/auth/google`
- Kept email/password flows unchanged

### 4. Documentation

**`AUTH_GOOGLE_OAUTH.md`**
- Complete guide for configuring Google OAuth in GCP
- Required environment variables
- Exact redirect URIs for local dev and production
- OAuth consent screen setup instructions
- Manual testing steps
- Troubleshooting guide
- Security notes

## Environment Variables Required

Add these to your `.env` file:

```env
# Google OAuth (add these)
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret

# Already configured
AUTH_ORIGIN=http://localhost:3000
AUTH_SECRET=your-random-secret
```

## Google Cloud Platform Setup

You need to configure OAuth 2.0 credentials in GCP:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** > **Credentials**
3. Create **OAuth client ID** (Web application)
4. Add authorized redirect URI:
   - Local: `http://localhost:3000/api/auth/callback/google`
   - Production: `https://yourdomain.com/api/auth/callback/google`
5. Configure OAuth consent screen with scopes: `openid`, `email`, `profile`

See `AUTH_GOOGLE_OAUTH.md` for detailed instructions.

## How It Works (Flow)

```
1. User clicks "Continue with Google" on /login
   ↓
2. Browser → GET /api/auth/google
   ↓
3. Server generates random state, stores in cookie
   ↓
4. Server redirects → Google consent screen
   ↓
5. User authorizes app in Google
   ↓
6. Google redirects → /api/auth/callback/google?code=...&state=...
   ↓
7. Server validates state (CSRF protection)
   ↓
8. Server exchanges code for access_token
   ↓
9. Server fetches user profile (email, name, picture)
   ↓
10. Server upserts user_profile in database
    ↓
11. Server creates Session record
    ↓
12. Server sets session_token cookie
    ↓
13. Server redirects → /plan
```

## Security Features

- **CSRF Protection**: Random `state` parameter stored in httpOnly cookie
- **httpOnly Cookies**: Session tokens not accessible to JavaScript (XSS protection)
- **Secure Flag**: Only set in production (HTTPS only)
- **Short-lived State**: OAuth state cookie expires in 10 minutes
- **Token Validation**: All parameters validated before proceeding
- **Error Handling**: Failures redirect to `/login?error=<code>` with server-side logging

## Manual Testing Steps

### Local Testing (requires GCP setup):

1. Ensure `.env` has `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
2. Ensure GCP console has redirect URI: `http://localhost:3000/api/auth/callback/google`
3. Start dev server: `npm run dev`
4. Visit `http://localhost:3000/login`
5. Click "Continue with Google"
6. Should redirect to Google consent screen
7. After authorizing, should redirect back to `/plan` logged in
8. Verify in browser: `session_token` cookie is set
9. Verify in database: `user_profile` and `session` records created

### Testing Without GCP Setup:

Without Google credentials configured:
- Button still appears (clean UI)
- Clicking it will redirect to `/login?error=google_not_configured`
- Email/password login still works normally

### Error Scenarios:

The implementation handles these errors gracefully:

- `google_not_configured`: Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET
- `oauth_state`: State parameter mismatch (CSRF protection triggered)
- `oauth_failed`: Google returned an error
- `no_code`: No authorization code received
- `token_exchange`: Failed to exchange code for token
- `no_token`: No access token in response
- `profile_fetch`: Failed to fetch user profile
- `no_email`: User profile doesn't include email
- `oauth_error`: Generic error during callback processing

All errors:
- Log to server console with details
- Redirect to `/login?error=<code>`
- Allow user to try again

## Integration with Existing Auth System

This implementation:
- ✅ Uses existing `Session` table and cookie system
- ✅ Uses existing `user_profile` table
- ✅ Works with existing `useAuth()` composable
- ✅ Works with existing route protection middleware
- ✅ Creates sessions with same 30-day expiry
- ✅ Uses same cookie options as email/password login
- ✅ Optionally uses `Account` table if it exists

No changes needed to:
- `server/middleware/auth.ts`
- `app/composables/useAuth.ts`
- `app/middleware/auth.global.ts`
- Existing API endpoints
- Existing protected routes

## Database Impact

**Required Tables** (already exist):
- `user_profile`: Stores user email, name, avatar
- `session`: Stores active sessions

**Optional Table**:
- `account`: Links OAuth provider to user (gracefully skipped if missing)

On first Google login:
- Creates `user_profile` if new user
- Updates `display_name` and `avatar_url` if existing user
- Creates `session` record
- Optionally creates `account` record linking Google profile

## Production Deployment Checklist

Before deploying to production:

1. **Environment Variables**:
   - Set `GOOGLE_CLIENT_ID` in production env
   - Set `GOOGLE_CLIENT_SECRET` in production env
   - Set `AUTH_ORIGIN=https://yourdomain.com`
   - Ensure `AUTH_SECRET` is set (different from dev)
   - Set `NODE_ENV=production`

2. **GCP Configuration**:
   - Add production redirect URI to GCP console
   - Update OAuth consent screen with production details
   - If using Google Workspace domain, configure accordingly

3. **Testing**:
   - Test Google login flow in production
   - Verify cookies are set with `secure` flag
   - Test logout and re-login
   - Verify session persistence across page reloads

## Code Quality

- ✅ TypeScript typed
- ✅ Error handling on all failure paths
- ✅ Server-side logging for debugging
- ✅ No new npm dependencies
- ✅ Follows existing Nuxt patterns
- ✅ Consistent with existing auth endpoints
- ✅ Security best practices (CSRF, httpOnly, secure cookies)

## Future Enhancements (Out of Scope)

- [ ] Microsoft/Apple OAuth providers
- [ ] Refresh token support (currently 30-day sessions)
- [ ] Remember me functionality
- [ ] Account linking (link Google to existing email/password account)
- [ ] Email verification for non-OAuth accounts
- [ ] Two-factor authentication
- [ ] Session management UI (view/revoke active sessions)

## Troubleshooting

If Google login doesn't work:

1. Check server logs for error messages
2. Verify `.env` has correct values
3. Verify GCP redirect URI matches exactly
4. Check OAuth consent screen is configured
5. Ensure cookies are enabled in browser
6. Check for mixed content warnings (http/https)

See `AUTH_GOOGLE_OAUTH.md` for detailed troubleshooting steps.
