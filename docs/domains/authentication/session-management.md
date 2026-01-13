---
title: Session Management
category: domain
domain: authentication
status: stable
---

# Session Management

JuiceFuel uses session-based authentication with httpOnly cookies.

## Session Flow

```
1. User logs in (email/password or OAuth)
   ↓
2. Server creates session record
   ↓
3. Server generates random session token
   ↓
4. Server sets httpOnly cookie with token
   ↓
5. Browser stores cookie (automatic)
   ↓
6. Subsequent requests include cookie
   ↓
7. Middleware validates session
   ↓
8. User context attached to request
```

## Session Table

```prisma
model session {
  id            String   @id @default(uuid())
  session_token String   @unique
  user_id       String
  expires       DateTime
  created_at    DateTime @default(now())
  updated_at    DateTime @updatedAt
  
  user user_profile @relation(fields: [user_id], references: [id], onDelete: Cascade)
}
```

## Cookie Configuration

```typescript
setCookie(event, 'session_token', session.session_token, {
  httpOnly: true,                        // Not accessible to JavaScript
  secure: process.env.NODE_ENV === 'production', // HTTPS only in prod
  sameSite: 'lax',                       // CSRF protection
  maxAge: 30 * 24 * 60 * 60,            // 30 days
  path: '/'                              // Available site-wide
});
```

### Cookie Attributes Explained

**httpOnly: true**
- Cookie not accessible via `document.cookie`
- Prevents XSS attacks from stealing token
- Only server can read cookie

**secure: true (production)**
- Cookie only sent over HTTPS
- Prevents MITM attacks
- Auto-disabled in development (localhost)

**sameSite: 'lax'**
- Cookie sent on top-level navigation (clicking links)
- Not sent on cross-site POST requests
- CSRF protection

**maxAge: 30 days**
- Session expires after 30 days
- User must re-login
- Balances security vs convenience

**path: '/'**
- Cookie available for all routes
- Needed for API endpoints and pages

## Session Creation

### On Login
```typescript
// server/api/auth/login.post.ts
const session = await prisma.session.create({
  data: {
    user_id: user.id,
    session_token: crypto.randomUUID(),
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  }
});

setCookie(event, 'session_token', session.session_token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 30 * 24 * 60 * 60,
  path: '/'
});
```

### On Signup
Same as login - create session immediately after user creation.

### On OAuth Callback
Same as login - create session after successful OAuth.

## Session Validation

### Middleware
**File:** `server/middleware/auth.ts`

Runs on every request:
```typescript
export default defineEventHandler(async (event) => {
  const sessionToken = getCookie(event, 'session_token');
  
  if (sessionToken) {
    const session = await prisma.session.findUnique({
      where: { session_token: sessionToken },
      include: { user: true }
    });
    
    if (session && session.expires > new Date()) {
      event.context.user = session.user;
      event.context.userId = session.user.id;
    }
  }
});
```

### Protected Endpoints
```typescript
export default defineEventHandler(async (event) => {
  // Require authentication
  const userId = await requireAuth(event);
  
  // User context available
  const user = event.context.user;
  
  // ...
});
```

### `requireAuth()` Helper
**File:** `server/utils/authHelpers.ts`

```typescript
export async function requireAuth(event: any) {
  if (!event.context.userId) {
    throw createError({
      statusCode: 401,
      message: 'Authentication required'
    });
  }
  return event.context.userId;
}
```

## Session Termination

### Logout
```typescript
// server/api/auth/logout.post.ts
const sessionToken = getCookie(event, 'session_token');

if (sessionToken) {
  // Delete from database
  await prisma.session.deleteMany({
    where: { session_token: sessionToken }
  });
}

// Clear cookie
deleteCookie(event, 'session_token');
```

### Expiration
- Sessions expire after 30 days
- Middleware checks `session.expires > new Date()`
- Expired sessions automatically invalid
- User must re-login

### Manual Revocation
Delete session from database:
```sql
DELETE FROM session WHERE user_id = 'user-id';
```

User immediately logged out on next request.

## Security Considerations

### ✅ Strengths

**httpOnly Protection**
- XSS cannot steal tokens
- Token never exposed to JavaScript

**CSRF Protection**
- SameSite=Lax prevents cross-site POST
- OAuth state parameter protects OAuth flow

**Random Tokens**
- crypto.randomUUID() unpredictable
- No sequential IDs
- Impossible to guess

**Automatic Cleanup**
- Expired sessions ignored by middleware
- Can periodically delete expired sessions

### ⚠️ Limitations

**Session Fixation**
- Not vulnerable (token generated on login, not before)

**Session Hijacking**
- If attacker steals token, can impersonate user
- Mitigated by: secure flag (HTTPS), short expiry (30 days)

**No Refresh Tokens**
- After 30 days, must re-login
- Trade-off: security vs convenience

## Best Practices

### DO ✅
- Use httpOnly cookies for tokens
- Set secure flag in production
- Use random UUIDs for tokens
- Check expiration on every request
- Delete sessions on logout

### DON'T ❌
- Store tokens in localStorage (XSS vulnerable)
- Use predictable tokens (sequential IDs)
- Allow infinite session duration
- Skip expiration checks
- Send cookies over HTTP in production

## Maintenance

### Cleanup Expired Sessions
```typescript
// Run periodically (cron job)
await prisma.session.deleteMany({
  where: {
    expires: { lt: new Date() }
  }
});
```

### Revoke All User Sessions
```typescript
await prisma.session.deleteMany({
  where: { user_id: 'user-id' }
});
```

### Session Analytics
```sql
-- Active sessions count
SELECT COUNT(*) FROM session WHERE expires > NOW();

-- Sessions per user
SELECT user_id, COUNT(*) FROM session 
WHERE expires > NOW() 
GROUP BY user_id;
```

## Related Documentation

- [[auth-system-overview]] - Overall authentication system
- [[google-oauth-setup]] - OAuth flow and sessions
- [[../../guides/api-testing]] - Testing authenticated endpoints
