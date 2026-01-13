---
title: Active Household Pattern
category: concept
domain: households
status: stable
---

# Active Household Pattern

JuiceFuel uses an "active household" pattern where users select one household at a time as their working context.

## The Problem

Users can belong to multiple households:
- Personal household
- Family household
- Shared apartment with roommates
- Work lunch planning group

**Without active household:**
- Every page needs a household selector dropdown
- Easy to add meals/recipes to wrong household
- Cognitive overhead deciding "which household?"
- Confusing UI with selectors everywhere

## The Solution

**One active household at a time:**
- User selects active household in Settings
- All features automatically use active household
- No dropdowns in planner, recipes, shopping
- Cleaner UI, less cognitive load

## How It Works

```
User Profile
    ↓
active_household_id (nullable UUID)
    ↓
All features query active household:
- Meal planner: active household's meal_plan
- Recipes: active household's recipe_libraries
- Shopping: active household's shopping_lists
    ↓
To switch: Settings → Click "Switch" on different household
```

## UX Flow

### New User
```
1. Sign up
2. System auto-creates household
3. Sets as active_household_id
4. User can immediately use all features
```

### Join Second Household
```
1. Receive invite link
2. Join household (becomes MEMBER)
3. Still using original active household
4. Go to Settings when ready
5. Click "Switch" on new household
6. Now all features use new household
```

### Multi-Household User
```
Monday: Working on personal meal plan
- Active household: Personal
- Planner shows personal meals
- Recipes from personal library

Tuesday: Planning family meals
- Go to Settings
- Click "Switch" on Family household
- Active household: Family
- Planner shows family meals
- Recipes from family library
```

## Benefits

### ✅ Simplified UI
- **Before:** Dropdown in planner + recipes + shopping
- **After:** No dropdowns, clean interface

### ✅ Reduced Errors
- Can't accidentally add to wrong household
- Always clear which household you're working in

### ✅ Cognitive Load
- Don't decide "which household?" on every action
- One-time decision in Settings

### ✅ Mobile-Friendly
- No dropdowns taking up precious screen space
- Faster interaction (no selecting from dropdown)

## Implementation

### Database
`user_profile.active_household_id` (nullable UUID)

### Auto-Set Logic
```typescript
// If user has no active household, set to oldest
if (!user.active_household_id) {
  const firstHousehold = await prisma.household_member.findFirst({
    where: { user_id: user.id },
    orderBy: { created_at: 'asc' }
  });
  
  await prisma.user_profile.update({
    where: { id: user.id },
    data: { active_household_id: firstHousehold.household_id }
  });
}
```

### Switching
```typescript
// PATCH /api/profile/active-household
const { household_id } = body;

// Validate membership
const membership = await prisma.household_member.findFirst({
  where: { user_id, household_id }
});

if (!membership) {
  throw createError({ statusCode: 403, message: 'Not a member' });
}

// Update active household
await prisma.user_profile.update({
  where: { id: user_id },
  data: { active_household_id: household_id }
});
```

## Trade-offs

### ✅ Pros
- Simpler UI
- Fewer errors
- Better mobile experience
- Clearer mental model

### ⚠️ Cons
- Extra step to switch households
- Not ideal for users constantly switching
- Need Settings page for switching

**Decision:** Pros outweigh cons for typical usage patterns.

## Alternative Considered: Dropdown Everywhere

**Rejected because:**
- Cluttered UI
- Cognitive overhead on every action
- Mobile UX suffers
- More error-prone
- Added complexity in every component

## Related Documentation

- [[../domains/households/household-management]] - Household system details
- [[../decisions/why-single-active-household]] - Extended rationale
