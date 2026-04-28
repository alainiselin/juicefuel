---
title: Authentication System Overview
category: domain
domain: authentication
status: stable
---

# Authentication System Overview

JuiceFuel implements session-based authentication with email/password, Google OAuth, and (for native iOS) Sign in with Apple. The same session token is delivered as either a `session_token` httpOnly cookie (web) or an `Authorization: Bearer <token>` header (native iOS).

## Architecture

### Components

```
┌──────────────────────────────┐   ┌──────────────────────────────┐
│  Web client                  │   │  iOS client (ios/)           │
│  - app/pages/login.vue       │   │  - LoginView                 │
│  - useAuth() composable      │   │  - AuthService (@Observable) │
│  - Session via cookie        │   │  - APIClient (Bearer header) │
└──────────────┬───────────────┘   └──────────────┬───────────────┘
               │                                  │
               │ session_token cookie             │ Authorization: Bearer …
               │                                  │
               └──────────────┬───────────────────┘
                              ▼
┌─────────────────────────────────────────────┐
│  API Endpoints (server/api/auth/)           │
│  - POST /auth/signup       → {user, token}  │
│  - POST /auth/login        → {user, token}  │
│  - POST /auth/logout                        │
│  - GET  /auth/session                       │
│  - GET  /auth/google[?return_to=ios]        │
│  - GET  /auth/callback/google               │
│  - POST /auth/apple        → {user, token}  │
└───────────────┬─────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────┐
│  Auth Middleware (server/middleware/)       │
│  - Reads session_token cookie OR            │
│    Authorization: Bearer header             │
│  - Attaches user to event.context           │
└───────────────┬─────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────┐
│  Database (Prisma)                          │
│  - user_profile                             │
│  - session                                  │
│  - account (OAuth: google, apple)           │
└─────────────────────────────────────────────┘
```

## Database Schema

### user_profile Table
- `id` (UUID): Primary key
- `email` (string, unique): User email
- `display_name` (string): Display name
- `avatar_url` (string, nullable): Profile picture URL
- `password_hash` (string, nullable): Bcrypt hash (null for OAuth-only users)
- `email_verified` (timestamp, nullable): Email verification timestamp
- `active_household_id` (UUID, nullable): Currently active household
- `created_at`, `updated_at`: Timestamps

### session Table
- `id` (UUID): Primary key
- `session_token` (string, unique): Random session identifier
- `user_id` (UUID): Foreign key to user_profile
- `expires` (timestamp): Session expiration (30 days)
- `created_at`, `updated_at`: Timestamps

### account Table (OAuth)
- `id` (UUID): Primary key
- `user_id` (UUID): Foreign key to user_profile
- `provider` (string): OAuth provider (e.g., "google")
- `provider_account_id` (string): Provider's user ID
- `access_token`, `refresh_token`, etc.: OAuth tokens

## Authentication Flows

### Email/Password Signup

```
1. User fills signup form
   ↓
2. POST /api/auth/signup
   ↓
3. Validate email, password (min 8 chars)
   ↓
4. Hash password with bcrypt (10 rounds)
   ↓
5. Create user_profile
   ↓
6. Call ensureDefaultHouseholdForUser()
   ↓
7. Create session (30-day expiry)
   ↓
8. Set httpOnly session_token cookie
   ↓
9. Return user object
```

### Email/Password Login

```
1. User submits login form
   ↓
2. POST /api/auth/login
   ↓
3. Find user by email
   ↓
4. Verify password with bcrypt.compare()
   ↓
5. Create session
   ↓
6. Set httpOnly session_token cookie
   ↓
7. Return user object
```

### Google OAuth Flow

See [[google-oauth-setup]] for detailed flow.

The same endpoint serves both web and native iOS clients. iOS calls `/api/auth/google?return_to=ios` and the callback redirects to `juicefuel://auth/callback?token=…` instead of `/plan` so the `ASWebAuthenticationSession` in the native app can capture the session token. No extra Google Cloud Console configuration is needed for iOS — the redirect Google sees is still our HTTPS callback.

### Sign in with Apple (iOS-only)

```
1. iOS app: SignInWithAppleButton triggers ASAuthorizationController
   ↓
2. User authenticates with Face ID / Touch ID / password
   ↓
3. iOS receives identity_token (JWT) + (first time only) email + name
   ↓
4. iOS POSTs to /api/auth/apple with { identity_token, email?, display_name? }
   ↓
5. Server verifies the JWT against Apple's JWKS
   (issuer = https://appleid.apple.com, audience = APPLE_BUNDLE_ID)
   ↓
6. Server upserts user_profile (matched by Apple sub or email)
   and creates an account row with provider='apple'
   ↓
7. Server creates session, returns { user, token }
```

The `APPLE_BUNDLE_ID` env var must match the iOS app's Bundle ID (currently `vip.juicecrew.juicefuel`). Apple only sends the user's email/name on the FIRST sign-in, so the iOS client passes them in the body when present.

### Session Validation

```
Every API Request:
1. Extract session_token from cookie
   (or from Authorization: Bearer <token> header for native clients)
   ↓
2. Middleware: Find session in database
   ↓
3. Check expiration
   ↓
4. Attach user to event.context
   ↓
5. Endpoint: Call requireAuth() if needed
```

### Logout

```
1. POST /api/auth/logout
   ↓
2. Delete session from database
   ↓
3. Clear session_token cookie
   ↓
4. Return success
```

## Security Features

### Password Security
- **Bcrypt hashing**: 10 rounds (slow, resistant to brute force)
- **Minimum length**: 8 characters
- **No password rules**: No forced complexity (users can choose secure passphrases)
- **Salted hashes**: Bcrypt includes salt automatically

### Session Security
- **httpOnly cookies**: Not accessible to JavaScript (XSS protection)
- **SameSite=Lax**: CSRF protection
- **Secure flag**: Only sent over HTTPS in production
- **30-day expiry**: Auto-logout after inactivity
- **Random tokens**: crypto.randomUUID() for unpredictability

### OAuth Security
- **State parameter**: CSRF protection (random token in cookie)
- **Token exchange**: Never expose access tokens to client
- **Provider validation**: Verify tokens with Google

### Data Isolation
- **requireAuth() helper**: All protected endpoints verify user
- **Household filtering**: Users only see their household data
- **No global data access**: Everything scoped to user/household

## API Endpoints

### POST /api/auth/signup
**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "display_name": "User Name"
}
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "display_name": "User Name",
    "avatar_url": null
  },
  "token": "abc123-… (session_token)"
}
```

The `token` is the same value as the `session_token` cookie. Web clients ignore it (the cookie is set automatically); native clients use it as the `Authorization: Bearer <token>` value on subsequent requests.

### POST /api/auth/login
**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "display_name": "User Name",
    "avatar_url": null
  },
  "token": "abc123-…"
}
```

### POST /api/auth/apple
Native iOS only. Validates an Apple identity token and returns a session.

**Request:**
```json
{
  "identity_token": "<JWT from ASAuthorizationAppleIDCredential.identityToken>",
  "email": "user@example.com",
  "display_name": "User Name"
}
```

`email` and `display_name` are optional and only present on the first sign-in (Apple only emits them once per app).

**Response:** same shape as `/login`: `{ user, token }`.

### GET /api/auth/session
**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "display_name": "User Name",
    "avatar_url": null
  }
}
```

Or if not authenticated:
```json
{
  "user": null
}
```

### POST /api/auth/logout
**Response:**
```json
{
  "success": true
}
```

## Client Integration

### useAuth() Composable

```typescript
const { user, loading, fetchSession, login, signup, logout } = useAuth();

// On app load
onMounted(() => {
  await fetchSession();
});

// Login
await login('user@example.com', 'password123');

// Signup
await signup('user@example.com', 'password123', 'User Name');

// Logout
await logout();

// Check auth state
if (user.value) {
  console.log('Logged in as', user.value.display_name);
}
```

### Route Protection

Protected routes automatically redirect to `/login`:
- `/plan`
- `/recipes`
- `/profile`
- `/settings`

Middleware: `app/middleware/auth.global.ts`

### Server-Side Auth

```typescript
// In API endpoint
export default defineEventHandler(async (event) => {
  // Require authentication
  const userId = await requireAuth(event);
  
  // Access user from context
  const user = event.context.user;
  
  // Filter data by user
  const recipes = await recipeRepo.findByUserId(userId);
  
  return recipes;
});
```

## Files Structure

```
server/
├── api/auth/
│   ├── signup.post.ts          # Email signup → {user, token}
│   ├── login.post.ts           # Email login → {user, token}
│   ├── logout.post.ts          # Session termination
│   ├── session.get.ts          # Session check
│   ├── google.get.ts           # OAuth initiation (web + ?return_to=ios)
│   ├── callback/google.get.ts  # OAuth callback (redirects to /plan or juicefuel://)
│   └── apple.post.ts           # Sign in with Apple (validates JWT)
├── middleware/
│   └── auth.ts                 # Session validation (cookie OR Bearer)
└── utils/
    ├── authHelpers.ts          # requireAuth()
    └── householdBootstrap.ts   # Auto-create household

app/                            # web client (Nuxt)
├── composables/
│   └── useAuth.ts              # Auth state management
├── middleware/
│   └── auth.global.ts          # Route protection
└── pages/
    └── login.vue               # Login/signup UI

ios/                            # native iOS client (SwiftUI)
└── JuiceFuel/
    ├── Services/
    │   ├── AuthService.swift           # @Observable; login/signup/Apple/Google
    │   ├── GoogleSignInService.swift   # ASWebAuthenticationSession driver
    │   ├── KeychainStore.swift         # Stores the Bearer token
    │   └── APIClient.swift             # Adds Authorization: Bearer header
    └── Views/
        └── LoginView.swift             # Email/pw + SIWA + Continue with Google
```

## Testing

### Manual Testing
```bash
# Signup
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","display_name":"Test"}' \
  -c cookies.txt

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' \
  -c cookies.txt

# Check session
curl http://localhost:3000/api/auth/session -b cookies.txt

# Logout
curl -X POST http://localhost:3000/api/auth/logout -b cookies.txt
```

### Test Checklist
- [ ] Signup creates user and household
- [ ] Login with correct credentials succeeds
- [ ] Login with wrong password fails
- [ ] Session persists across page reloads
- [ ] Logout clears session
- [ ] Protected routes redirect to login
- [ ] Data isolation between users works

## Related Documentation

- [[google-oauth-setup]] - Google OAuth configuration
- [[session-management]] - Session cookie details
- [[../../guides/api-testing]] - API testing examples
