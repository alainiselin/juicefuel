---
title: Public vs Private Recipe Libraries
category: concept
domain: recipes
status: stable
---

# Public vs Private Recipe Libraries

Recipe libraries can be **private** (household-only) or **public** (visible to all users).

## Library Scopes

### Private (Default)
- **Visibility:** Only household members
- **Use Case:** Personal recipes, family recipes
- **Who Can Edit:** Household members only
- **Who Can View:** Household members only
- **Who Can Use:** Household members (can add to meal plan)

### Public
- **Visibility:** All JuiceFuel users
- **Use Case:** Community recipes, sharing inspiration
- **Who Can Edit:** Only owning household members
- **Who Can View:** Everyone
- **Who Can Use:** Everyone (can add to meal plan)

## Why This Model?

### Sharing Without Collaboration
- Public libraries are **read-only** to non-members
- Non-members can browse and use recipes
- But cannot edit or add recipes
- Owning household retains control

### Community Recipes
- Central "Community Recipes" public library
- Curated by admin household
- Everyone can browse and use
- Like a built-in recipe book

### Privacy by Default
- New libraries are private by default
- User explicitly chooses to make public
- No accidental recipe leaks

## Use Cases

### Personal Household (Private)
```
User A creates library: "My Secret Recipes"
- Marked private (default)
- Only User A can see and use
- User A's roommate cannot access
```

### Shared Household (Private)
```
Family Household library: "Family Favorites"
- Marked private
- All family members can view/edit/use
- Other JuiceFuel users cannot see
```

### Community Library (Public)
```
Admin creates library: "JuiceFuel Community Recipes"
- Marked public
- All users can browse
- All users can add to their meal plans
- Only admin household can edit
```

### Influencer/Creator (Public)
```
Chef creates library: "Chef Alice's Best Dishes"
- Marked public
- Followers can browse and use recipes
- Chef retains control over content
- Could be monetized in future
```

## Implementation

### Database
```prisma
model recipe_library {
  id              String  @id @default(uuid())
  household_id    String
  name            String
  is_public       Boolean @default(false)
  created_by_user_id String?
  // ...
}
```

### Access Control

**Can View Library:**
```typescript
// User can see library if:
// 1. User is member of owning household, OR
// 2. Library is public

const canView = 
  isMemberOfHousehold(userId, library.household_id) ||
  library.is_public;
```

**Can Edit Library:**
```typescript
// User can edit library if:
// - User is member of owning household

const canEdit = isMemberOfHousehold(userId, library.household_id);
```

**Can Toggle Public/Private:**
```typescript
// User can toggle if:
// - User is member of owning household

const canToggle = isMemberOfHousehold(userId, library.household_id);
```

## UI Indicators

```
📚 Recipe Libraries

Personal (Private)
- My Recipes (5 recipes)

Shared (Private)
- Family Favorites (12 recipes)

Public 🌐
- Community Recipes (45 recipes)
- Chef Alice's Best Dishes (23 recipes)
```

**Icons:**
- 🌐 = Public library
- 📚 = Shared library from another household
- (none) = Own household's private library

## API Endpoints

### List Accessible Libraries
```
GET /api/recipe-libraries
```

Returns:
- User's household libraries (private)
- All public libraries
- Includes `is_own_household`, which clients use to distinguish writable own libraries from read-only public libraries

### Create Library
```
POST /api/recipe-libraries
Body: { name, is_public }
```

Creates in user's active household.

### Toggle Public/Private
```
PATCH /api/recipe-libraries/[id]
Body: { is_public: true/false }
```

Only household members can toggle.

### Saving Generated Recipes

Generated AI drafts and imported URL drafts must be saved to a library owned by the user's active household. Public libraries from other households appear in browse/search contexts but should not appear in save pickers.

## Future Enhancements

### Library Sharing (Not Implemented)
- Share private library with specific other households
- Collaboration without making public
- Granular permissions

### Featured Libraries
- Curate "featured" public libraries
- Browse by category (Italian, Desserts, etc.)
- Search across public libraries

### Library Cloning
- Duplicate public library to own household
- Make edits without affecting original

## Related Documentation

- [[../domains/recipes/recipe-library-system]] - Full library system
- [[../domains/households/household-management]] - Household access control
