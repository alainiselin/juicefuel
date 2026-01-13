---
title: Authentication System Overview
category: domain
domain: authentication
status: stable
---

# Authentication System Overview

JuiceFuel implements session-based authentication with email/password and Google OAuth support.

## Architecture

### Components

```
┌─────────────────────────────────────────────┐
│  Login Page (app/pages/login.vue)          │
│  - Email/Password form                      │
│  - Google OAuth button                      │
└───────────────┬─────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────┐
│  useAuth() Composable                       │
│  - login(), signup(), logout()              │
│  - Session state management                 │
└───────────────┬─────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────┐
│  API Endpoints (server/api/auth/)           │
│  - POST /auth/signup                        │
│  - POST /auth/login                         │
│  - POST /auth/logout                        │
│  - GET  /auth/session                       │
│  - GET  /auth/google                        │
│  - GET  /auth/callback/google               │
└───────────────┬─────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────┐
│  Auth Middleware (server/middleware/)       │
│  - Validates session token                  │
│  - Attaches user to event.context           │
└───────────────┬─────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────┐
│  Database (Prisma)                          │
│  - user_profile                             │
│  - session                                  │
│  - account (OAuth)                          │
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

### Session Validation

```
Every API Request:
1. Extract session_token from cookie
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
    "display_name": "User Name"
  }
}
```

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
  }
}
```

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
│   ├── signup.post.ts          # Email signup
│   ├── login.post.ts           # Email login
│   ├── logout.post.ts          # Session termination
│   ├── session.get.ts          # Session check
│   ├── google.get.ts           # OAuth initiation
│   └── callback/google.get.ts  # OAuth callback
├── middleware/
│   └── auth.ts                 # Session validation
└── utils/
    ├── authHelpers.ts          # requireAuth()
    └── householdBootstrap.ts   # Auto-create household

app/
├── composables/
│   └── useAuth.ts              # Auth state management
├── middleware/
│   └── auth.global.ts          # Route protection
└── pages/
    └── login.vue               # Login/signup UI
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
