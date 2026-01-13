# Recipe Library Management - Complete

## Overview
Overhauled recipe management to support multiple recipe libraries with public/private sharing and proper library selection.

## What Changed

### Database Schema
- Added `is_public` (Boolean) to `recipe_library` - controls library visibility
- Added `created_by_user_id` (UUID nullable) to `recipe_library` - tracks who created it
- Added relation from `user_profile` to track created libraries
- Migration: `20251231142250_add_recipe_library_public`

### API Endpoints

#### New
- **GET `/api/recipe-libraries`** - List all accessible recipe libraries
  - Returns user's household libraries + all public libraries
  - Includes recipe count, creator info, and ownership flag
  - Marks which libraries belong to user's household

- **POST `/api/recipe-libraries`** - Create new recipe library
  - Body: `{ name: string, is_public?: boolean }`
  - Creates library in user's active household
  - Links to creator (current user)

- **PATCH `/api/recipe-libraries/[id]`** - Update library settings
  - Body: `{ name?: string, is_public?: boolean }`
  - Only household members can update
  - Toggle public/private status

#### Existing (Already Supported)
- **GET `/api/recipes?library_id=xxx`** - Filter recipes by library
- **POST `/api/recipes`** - Create recipe (accepts library_id in body)

### UI Changes

#### Recipes Page (`app/pages/recipes/index.vue`)
Complete redesign with:

**1. Library Selector**
- Dropdown showing all accessible libraries
- Shows recipe count per library
- Icons: 🌐 for public, 📚 for shared from other households
- Auto-selects first own library

**2. Manage Libraries Button**
- Opens library management modal
- Shows all libraries with details
- Can create new libraries
- Toggle public/private for own libraries

**3. Updated Recipe Creation**
- **Removed**: Raw UUID input field
- **Added**: Library dropdown (shows only own household's libraries)
- Pre-fills with currently selected library
- Cleaner, more intuitive interface

**4. Library Management Modal**
Features:
- Create new library section (name + public checkbox)
- List of all accessible libraries
- Each library shows:
  - Name with public/shared badges
  - Recipe count
  - Creator name
  - Toggle button (for own libraries only)
- Visual distinction between own and shared libraries

## User Experience Improvements

### Before
- Had to manually enter UUID for recipe library ID
- No way to see available libraries
- No public library support
- Confusing and error-prone

### After
- **Visual library browser** with counts and badges
- **Easy library creation** with public/private toggle
- **Public library discovery** - can browse other users' public libraries
- **Dropdown selection** when creating recipes
- **Library filtering** to focus on specific collections
- **Clear ownership indicators** (own vs shared)

## Features

### Library Visibility
- **Private (default)**: Only visible to household members
- **Public**: Visible to all users across all households
- **Toggle anytime**: Owners can switch between public/private

### Library Access
- **Own Household**: Full access - create, edit recipes
- **Public Libraries**: Read-only access - can view and use recipes in meal plans
- **Filtered View**: Select library to see only its recipes

### Library Indicators
- 🌐 = Public library (anyone can see)
- 📚 = Shared library (from another household)
- (no icon) = Private library from your household

## Testing Checklist

- [ ] Navigate to /recipes
- [ ] Click "Manage Libraries"
- [ ] Create a new private library
- [ ] Create a new public library
- [ ] Toggle library between public/private
- [ ] Switch library in dropdown - verify recipes filter
- [ ] Create recipe and select library from dropdown
- [ ] Verify public library shows in other user's library list
- [ ] Verify can't create recipes in shared public libraries
- [ ] Check library badges display correctly

## Technical Details

### Library Access Logic
```typescript
// User can see:
// 1. All libraries from their active household
// 2. All public libraries from any household

WHERE (household_id = user.active_household_id) 
   OR (is_public = true)
```

### Recipe Creation Access
- Can only create recipes in own household's libraries
- Dropdown filters to show only `is_own_household = true`
- Public libraries are read-only for non-household members

### Performance
- Libraries loaded once on mount
- Recipe count included in library list query
- Indexed by `is_public` for fast public library lookups

## Migration Notes

### For Existing Libraries
- All existing libraries set to `is_public = false`
- `created_by_user_id` set to NULL (can be populated later if needed)
- No breaking changes - existing recipes continue to work

### Database
- Run: `npx prisma migrate dev` (already applied)
- Run: `npx prisma generate` (already applied)
- Nullable fields allow graceful migration

## Future Enhancements
- Library search/filter
- Popular public libraries feed
- Library categories/tags
- Fork public recipes to own library
- Library templates
- Collaborative editing for household libraries
- Library statistics (views, uses in meal plans)
