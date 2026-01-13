---
title: Google OAuth Setup
category: domain
domain: authentication
status: stable
---

# Google OAuth Setup

Configure Google OAuth authentication for JuiceFuel.

## Environment Variables

Add to `.env`:

```env
# Google OAuth
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret

# Auth configuration (already set)
AUTH_ORIGIN=http://localhost:3000
AUTH_SECRET=your-random-secret-string
```

Generate AUTH_SECRET:
```bash
openssl rand -base64 32
```

## Google Cloud Platform Setup

### 1. Create OAuth 2.0 Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select or create a project
3. Navigate to **APIs & Services** > **Credentials**
4. Click **Create Credentials** > **OAuth client ID**
5. Select **Web application** as application type

### 2. Configure Redirect URIs

Add these exact URLs:

**Local Development:**
```
http://localhost:3000/api/auth/callback/google
```

**Production:**
```
https://yourdomain.com/api/auth/callback/google
https://juicecrew.vip/api/auth/callback/google
```

### 3. OAuth Consent Screen

Configure with:
- **Application name:** JuiceFuel
- **User support email:** your-email@example.com
- **Developer contact:** your-email@example.com
- **Scopes:** Only these are needed:
  - `openid`
  - `email`
  - `profile`

**User Type:**
- **External**: For public access (requires verification after 100 users)
- **Internal**: For Google Workspace domain only (no verification needed)

### 4. Authorized JavaScript Origins (Optional)

```
http://localhost:3000
https://yourdomain.com
https://juicecrew.vip
```

## OAuth Flow

```
1. User clicks "Continue with Google"
   ↓
2. Browser → GET /api/auth/google
   ↓
3. Server generates random state token
   ↓
4. Server stores state in httpOnly cookie (10 min expiry)
   ↓
5. Server redirects → Google consent screen
   ↓
6. User authorizes app
   ↓
7. Google redirects → /api/auth/callback/google?code=...&state=...
   ↓
8. Server validates state (CSRF protection)
   ↓
9. Server exchanges code for access_token
   ↓
10. Server fetches user profile (email, name, picture)
    ↓
11. Server upserts user_profile in database
    ↓
12. Server creates Session record
    ↓
13. Server sets session_token httpOnly cookie
    ↓
14. Server redirects → /plan
```

## Implementation

### Initiate OAuth
**File:** `server/api/auth/google.get.ts`

Generates state token and redirects to Google consent screen.

### Handle Callback
**File:** `server/api/auth/callback/google.get.ts`

Validates state, exchanges code for token, creates user/session.

## Security Features

- **CSRF Protection**: Random state parameter validated via httpOnly cookie
- **httpOnly Cookies**: Session tokens not accessible to JavaScript
- **Secure Flag**: Only set in production (HTTPS only)
- **Short-lived State**: OAuth state cookie expires in 10 minutes
- **Token Validation**: All parameters validated before proceeding

## Testing

### Enable in UI
In `app/pages/login.vue`, the Google button is conditionally shown if `GOOGLE_CLIENT_ID` is set.

### Manual Test Flow
1. Ensure `.env` has `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
2. Ensure GCP redirect URI matches: `http://localhost:3000/api/auth/callback/google`
3. Start dev server: `npm run dev`
4. Visit `http://localhost:3000/login`
5. Click "Continue with Google"
6. Should redirect to Google consent screen
7. After authorizing, should redirect to `/plan` logged in
8. Verify `session_token` cookie is set
9. Verify `user_profile` and `session` records created in database

## Error Handling

The implementation handles these errors gracefully:

- `google_not_configured`: Missing credentials
- `oauth_state`: State parameter mismatch
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

## Troubleshooting

### Error: `redirect_uri_mismatch`
The redirect URI in GCP console must EXACTLY match `${AUTH_ORIGIN}/api/auth/callback/google`. Check for:
- Trailing slashes
- http vs https
- Exact domain match

### Error: `oauth_state`
State parameter mismatch (CSRF protection). This can happen if:
- Cookies are blocked
- Session expires during OAuth flow
- Browser security settings
Ensure cookies are enabled and try again.

### Error: `google_not_configured`
`GOOGLE_CLIENT_ID` or `GOOGLE_CLIENT_SECRET` not set in environment. Check `.env` file and restart server.

### Error: `no_email`
Google profile doesn't include email. Ensure email scope is requested and user grants permission.

## Production Deployment

### Checklist
- [ ] Set `GOOGLE_CLIENT_ID` in production env
- [ ] Set `GOOGLE_CLIENT_SECRET` in production env
- [ ] Set `AUTH_ORIGIN=https://yourdomain.com`
- [ ] Add production redirect URI to GCP console
- [ ] Update OAuth consent screen with production details
- [ ] Set `NODE_ENV=production` (enables secure cookies)
- [ ] Test Google login flow in production
- [ ] Verify cookies are set with `secure` flag

### Google Workspace Restriction
If using Google Workspace, you can restrict OAuth to domain users:
1. Use **Internal** user type in OAuth consent screen
2. Users must sign in with `@yourdomain.com` email
3. No need to add individual test users

## Related Documentation

- [[auth-system-overview]] - Overall authentication system
- [[session-management]] - Session cookie details
- [[../../guides/api-testing]] - Testing authentication
