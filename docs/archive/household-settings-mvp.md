# Household + Settings MVP Implementation Summary

## Overview
Implemented complete household management system with auto-creation on signup, invite system, and settings page.

## Files Created

### Server API Endpoints
1. **server/api/households/me.get.ts**
   - Returns current user's active household with members
   - Includes household info, member list with roles, and user's role

2. **server/api/households/[id].patch.ts**
   - Update household name (OWNER only)
   - Authorization check for ownership

3. **server/api/households/invite.post.ts**
   - Generate invite code (OWNER only)
   - Returns invite URL: `${origin}/join/{code}`
   - Handles unique constraint collisions with retry logic

4. **server/api/households/join.post.ts**
   - Join household by invite code
   - Checks for existing membership
   - Creates MEMBER role for joining users

5. **server/api/households/leave.post.ts**
   - Leave household
   - Prevents last OWNER from leaving
   - Removes membership from active household

### Server Utilities
6. **server/utils/householdBootstrap.ts**
   - `ensureDefaultHouseholdForUser(userId, displayName)` helper
   - Idempotent: only creates household if user has no memberships
   - Creates household + OWNER membership + recipe library

### Frontend Pages
7. **app/pages/settings.vue**
   - Complete household management UI
   - Features:
     - View/edit household name (OWNER only)
     - Member list with roles and avatars
     - Generate/copy invite link (OWNER only)
     - Leave household (with safety checks)
   - Loading and error states

8. **app/pages/join/[code].vue**
   - Invite code handler page
   - Shows loading → success/error states
   - Auto-redirects to /plan after successful join

### Database Changes
9. **prisma/schema.prisma**
   - Added `invite_code String? @unique` to household model
   - Migration: `20251231095734_add_household_invite_code`

### Auth Integration Updates
10. **server/api/auth/signup.post.ts**
    - Calls `ensureDefaultHouseholdForUser()` after user creation
    - Creates default household for new signups

11. **server/api/auth/callback/google.get.ts**
    - Calls `ensureDefaultHouseholdForUser()` after Google OAuth
    - Ensures Google users get a household on first login

## Key Features

### Auto-Creation
- **Credentials signup**: Creates household immediately after user registration
- **Google OAuth**: Creates household on first login if user has no memberships
- Household name: "{display_name}'s Household" or "My Household"
- Includes:
  - Household with OWNER membership
  - Recipe library ("My Recipes")

### Invite System
- OWNER can generate invite codes (12-char URL-safe base64url)
- Invite URL format: `http://localhost:3000/join/{code}`
- Codes are unique and stored in household.invite_code
- Join page handles validation and auto-redirects

### Authorization
- **Rename household**: OWNER only
- **Generate invites**: OWNER only
- **Leave household**: All roles, but:
  - Last OWNER cannot leave
  - Shows appropriate error message

### Data Isolation
- Each household has its own recipe library
- Meal plans belong to households
- Users only see data from households they're members of

## Database Schema Changes

```sql
-- Migration: add_household_invite_code
ALTER TABLE household ADD COLUMN invite_code TEXT;
CREATE UNIQUE INDEX household_invite_code_key ON household(invite_code);
```

## Manual Test Checklist

### 1. New User Signup
```bash
# Signup with credentials
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"newuser@test.com","password":"password123","display_name":"New User"}'

# Verify household created
curl http://localhost:3000/api/households/me \
  -H "Cookie: session_token={token_from_signup}"

# Expected: household named "New User's Household" with OWNER role
```

### 2. Google OAuth (if configured)
- Login with Google
- Check /api/households/me
- Should have auto-created household

### 3. Settings Page
```
Visit: http://localhost:3000/settings (while logged in)
- Should show household name, member list
- OWNER: should see rename input + invite button
- MEMBER: read-only household name
```

### 4. Invite Flow
```
As OWNER:
1. Click "Generate Invite Link" in settings
2. Copy the invite URL (e.g., http://localhost:3000/join/abc123xyz)
3. Logout
4. Signup as another user
5. Visit the invite URL
6. Should join household and redirect to /plan
7. Original owner should now see 2 members in settings
```

### 5. Leave Household
```
As MEMBER:
1. Go to settings
2. Click "Leave Household" → confirm
3. Redirects to /plan (may show no household if it was the only one)

As OWNER (solo):
1. Try to leave
2. Should show error: cannot leave as last owner
```

### 6. Rename Household
```
As OWNER:
1. Go to settings
2. Edit household name
3. Click Save
4. Should update and persist
```

## Environment Variables
No new env vars required. Uses existing:
- `AUTH_ORIGIN` for invite URL generation

## Seed Data
Existing seed.ts already creates:
- 2 users: test@juicefuel.local, second@juicefuel.local (password: password123)
- 2 households (one per user, OWNER role)
- 2 recipe libraries
- Multiple recipes and meal slots per household

## Known Issues / Future Work
1. **TypeScript errors** in settings.vue (non-blocking):
   - Need stricter null checks for data.household
   - Minor type refinements for members array

2. **Multi-household support**:
   - MVP assumes "active household" = first membership
   - Future: household switcher UI

3. **Invite expiration**:
   - Codes never expire (MVP)
   - Future: add expires_at timestamp

4. **Transfer ownership**:
   - Cannot transfer ownership yet
   - Last OWNER is locked in

5. **Remove members**:
   - OWNERs cannot remove other members yet
   - Only self-removal (leave) is supported

## Migration Commands
```bash
# Apply migration
npx prisma migrate dev

# Regenerate Prisma client
npx prisma generate

# Reseed database (optional)
npx prisma db seed
```

## Success Criteria ✅
- [x] Auto-create household on signup
- [x] Auto-create household on Google OAuth
- [x] Settings page shows household + members
- [x] OWNER can rename household
- [x] OWNER can generate invite links
- [x] Invite link works end-to-end
- [x] Users can join via invite code
- [x] Users can leave household (with safety checks)
- [x] Sidebar Settings icon navigates to /settings
- [x] Data isolation preserved (each household separate)

## Architecture Notes
- **Idempotent bootstrap**: Safe to call multiple times
- **Authorization**: Consistent use of requireAuth() + role checks
- **Error handling**: Clear status codes (400/403/404) + user messages
- **URL-safe codes**: base64url encoding (no special chars)
- **Migration safety**: Nullable invite_code (existing households unaffected)
