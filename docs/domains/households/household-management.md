---
title: Household Management
category: domain
domain: households
status: stable
---

# Household Management

Multi-household support with invite system and active household tracking.

## Overview

JuiceFuel supports users belonging to multiple households. Each user has one **active household** at a time, which is used across the planner, recipes, and shopping lists.

## Database Schema

### household Table
- `id` (UUID): Primary key
- `name` (string): Household name
- `invite_code` (string, unique, nullable): Active invite link code
- `created_at`, `updated_at`: Timestamps

### household_member Table (Join)
- `id` (UUID): Primary key
- `household_id` (UUID): Foreign key to household
- `user_id` (UUID): Foreign key to user_profile
- `role` (enum): OWNER | ADMIN | MEMBER
- `created_at`, `updated_at`: Timestamps

### user_profile.active_household_id
- Nullable UUID pointing to user's currently active household
- Auto-set to oldest household if not set
- Cleared when leaving active household

## Active Household Pattern

### Why One Active Household?
- **Simplifies UX**: No dropdown in planner, recipes, shopping
- **Reduces cognitive load**: User focuses on one household context
- **Centralized switching**: Settings page is the control center
- **Prevents mistakes**: Can't accidentally add to wrong household

### How It Works
```
User logs in
   ↓
Has active_household_id?
   ↓
YES: Use that household
   ↓
NO: Auto-set to oldest household
   ↓
All features use active household:
- Planner shows active household's meal plan
- Recipes show active household's libraries
- Shopping lists use active household
   ↓
To switch: Go to Settings → Click "Switch" on desired household
```

## Features

### Auto-Creation on Signup
When a user signs up (email or OAuth), the system automatically:
1. Creates a household named "{display_name}'s Household"
2. Creates OWNER membership
3. Creates a recipe library named "My Recipes"
4. Sets as active household

**Implementation:** `server/utils/householdBootstrap.ts`

### Invite System

#### Generating Invites
- Only OWNER can generate invite codes
- Codes are 12-character URL-safe base64url strings
- Stored in `household.invite_code` (nullable, unique)
- One active code per household
- Regenerating creates new code, invalidating old

#### Joining via Invite
```
User visits: /join/{invite_code}
   ↓
System validates code
   ↓
Creates MEMBER membership
   ↓
Does NOT set as active household (user chooses later)
   ↓
Redirects to /plan
```

### Role-Based Permissions

| Action | OWNER | ADMIN | MEMBER |
|--------|-------|-------|--------|
| View household | ✅ | ✅ | ✅ |
| Rename household | ✅ | ❌ | ❌ |
| Generate invites | ✅ | ❌ | ❌ |
| Switch active household | ✅ | ✅ | ✅ |
| Leave household | ✅* | ✅ | ✅ |
| Create recipes | ✅ | ✅ | ✅ |
| Plan meals | ✅ | ✅ | ✅ |

*Last OWNER cannot leave.

## API Endpoints

### GET /api/households/me
Returns user's active household with members.

**Response:**
```json
{
  "id": "uuid",
  "name": "My Household",
  "members": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "role": "OWNER",
      "user": {
        "display_name": "Alice",
        "avatar_url": null
      }
    }
  ],
  "userRole": "OWNER"
}
```

### GET /api/households
Returns all households user belongs to, with role annotations.

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "My Household",
    "userRole": "OWNER",
    "created_at": "2025-01-01T00:00:00Z"
  },
  {
    "id": "uuid2",
    "name": "Shared Household",
    "userRole": "MEMBER",
    "created_at": "2025-01-02T00:00:00Z"
  }
]
```

### PATCH /api/households/[id]
Update household name (OWNER only).

**Request:**
```json
{
  "name": "New Household Name"
}
```

### POST /api/households/invite
Generate invite code (OWNER only).

**Request:**
```json
{
  "household_id": "uuid"
}
```

**Response:**
```json
{
  "invite_url": "http://localhost:3000/join/abc123xyz",
  "invite_code": "abc123xyz"
}
```

### POST /api/households/join
Join household by invite code.

**Request:**
```json
{
  "invite_code": "abc123xyz"
}
```

**Response:**
```json
{
  "household": {
    "id": "uuid",
    "name": "Shared Household"
  }
}
```

### POST /api/households/leave
Leave household (optional household_id, defaults to active).

**Request:**
```json
{
  "household_id": "uuid"
}
```

**Validations:**
- Cannot leave if last OWNER
- Clears active_household_id if leaving active household

### PATCH /api/profile/active-household
Switch active household.

**Request:**
```json
{
  "household_id": "uuid"
}
```

**Validation:** User must be member of target household.

## UI Integration

### Settings Page
Centralized household management:
- **Active Household Section** (blue border, prominent)
  - Household name (editable for OWNER)
  - Member list with roles and avatars
  - Generate/copy invite link (OWNER only)
- **All Households Section**
  - Cards for each household
  - "Active" badge on current household
  - Role badge (Owner/Admin/Member)
  - Actions: Switch | Invite | Leave

### Planner Page
- No household selector (removed)
- Automatically uses active household's meal plan
- To switch households, user goes to Settings

### Recipes Page
- Library selector shows libraries from all accessible households
- Icons: 🌐 for public libraries, 📚 for shared from other households
- Creating recipes: can only choose own household's libraries

## Data Isolation

All data is filtered by household membership:

**Recipes:**
```typescript
// User can see recipes from:
// 1. Their household's libraries
// 2. Public libraries from any household

const households = await prisma.household_member.findMany({
  where: { user_id: userId },
  include: { household: { include: { recipe_libraries: true } } }
});

const libraryIds = households.flatMap(h => 
  h.household.recipe_libraries.map(l => l.id)
);

const recipes = await prisma.recipe.findMany({
  where: { recipe_library_id: { in: libraryIds } }
});
```

**Meal Plans:**
```typescript
// Validate user has access to meal plan's household
const mealPlan = await prisma.meal_plan.findUnique({
  where: { id: mealPlanId },
  include: { household: true }
});

const isMember = await prisma.household_member.findFirst({
  where: {
    household_id: mealPlan.household_id,
    user_id: userId
  }
});

if (!isMember) {
  throw createError({ statusCode: 403, message: 'Access denied' });
}
```

## Testing Scenarios

### Scenario 1: Single User, Single Household
- User signs up
- Auto-creates household and sets as active
- All features work immediately
- No household switching needed

### Scenario 2: Join Second Household
- User receives invite link
- Visits `/join/{code}`
- Joins household as MEMBER
- Can switch between households in Settings
- Each household has separate meal plans, recipes

### Scenario 3: Multiple Owners
- Two users each create household
- User A invites User B
- User B is MEMBER of A's household
- User B is OWNER of their own household
- Each can leave the other's household (but not their own if sole owner)

## Related Documentation

- [[../../concepts/active-household-pattern]] - Design rationale
- [[../../guides/api-testing]] - Testing household endpoints
- [[../authentication/auth-system-overview]] - User authentication
