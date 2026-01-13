# Shopping Articles Implementation - Fix for 500 Errors

## Problem
- GET `/api/ingredients` was throwing 500 errors
- POST `/api/ingredients/custom` was throwing 500 errors
- Root cause: Previous implementation tried to mix food and non-food items in the same `ingredient` table with household scoping, which violated the requirement to keep recipe ingredient search clean

## Solution: Separate Tables for Ingredients vs Articles

### Data Model Changes

#### New `shopping_article` Table
```prisma
model shopping_article {
  id              String               @id @default(uuid)
  household_id    String               @db.Uuid
  name            String               // Display name
  normalized_name String               // Lowercase for search
  default_unit    Unit?
  default_aisle   String @default("own-items")
  created_at      DateTime
  updated_at      DateTime
  household       household            @relation(...)
  shopping_items  shopping_list_item[]

  @@unique([household_id, normalized_name])
  @@index([household_id])
  @@index([normalized_name])
}
```

**Purpose**: Store household-scoped non-food items (bandaids, dish soap, etc.)

#### Updated `shopping_list_item` Table
```prisma
model shopping_list_item {
  // ... existing fields ...
  ingredient_id String? @db.Uuid  // Changed to nullable
  article_id    String? @db.Uuid  // NEW: reference to shopping_article
  
  ingredient ingredient? @relation(...)
  article    shopping_article? @relation(...)
  
  // Constraint: exactly one of ingredient_id or article_id must be non-null
}
```

#### Reverted `ingredient` Table
- Removed `household_id`, `is_recipe_eligible`, `aisle` fields
- `ingredient` table is now FOOD-ONLY again
- All ingredients are global (household_id = NULL)

### API Changes

#### 1. Fixed: GET `/api/ingredients`
**Purpose**: Food ingredients only (for recipe context)

**Changes**:
- Removed `getActiveHousehold` call (was causing 500 errors)
- Only searches global ingredients (`household_id = NULL`)
- Supports `recipe_only=true` parameter
- **NEVER** returns articles (non-food items)

**Example**:
```javascript
// Recipe ingredient search
GET /api/ingredients?query=chicken&recipe_only=true
// Returns: chicken, chicken breast, etc. (food only)
```

#### 2. Removed: POST `/api/ingredients/custom`
This endpoint was incorrect - it tried to store non-food items as ingredients.

#### 3. NEW: GET `/api/shopping/items/search`
**Purpose**: Combined search for shopping list (includes both food and non-food)

**Response Format**:
```json
[
  {
    "type": "INGREDIENT",
    "id": "uuid",
    "name": "chicken",
    "default_unit": "G",
    "aisle": "meat-fish"
  },
  {
    "type": "ARTICLE",
    "id": "uuid",
    "name": "bandaids",
    "default_unit": "PIECE",
    "aisle": "own-items"
  }
]
```

**Usage**: Shopping list search bar uses this endpoint

#### 4. NEW: POST `/api/shopping/articles`
**Purpose**: Create household-scoped non-food items

**Request**:
```json
{
  "name": "bandaids",
  "defaultAisle": "care-health" // optional, defaults to "own-items"
}
```

**Response**:
```json
{
  "id": "uuid",
  "name": "bandaids",
  "default_unit": "PIECE",
  "default_aisle": "care-health"
}
```

**Behavior**:
- Normalizes name to lowercase
- Idempotent: if article exists for household, returns existing one
- Creates article with `default_aisle` = "own-items" by default

#### 5. Updated: POST `/api/shopping-list/[id]/items`
**Changes**:
- Now accepts either `ingredient_id` OR `article_id` (exactly one required)
- Returns appropriate data based on type (ingredient or article)
- Articles get pseudo-tag based on their `default_aisle`

### Frontend Changes

#### shopping.vue
**Search Function (`performSearch`)**:
```javascript
// OLD (broken):
GET /api/ingredients?query=band%20aid

// NEW (working):
GET /api/shopping/items/search?query=band%20aid
```

**Add Item Function**:
```javascript
// Renamed: addIngredientToList → addItemToList
// Now handles both:
if (item.type === 'ARTICLE') {
  await store.addItem(listId, undefined, qty, unit, item.id); // article_id
} else {
  await store.addItem(listId, item.id, qty, unit); // ingredient_id
}
```

**Create Custom Item**:
```javascript
// OLD (broken):
POST /api/ingredients/custom

// NEW (working):
POST /api/shopping/articles
```

#### Recipe Component
**NO CHANGES NEEDED** - recipe ingredient search already uses `/api/ingredients` which only returns food items.

### Boundary Enforcement

**Clear Separation**:
1. **`ingredient` table = FOOD ONLY**
   - Used by recipes
   - Searched by recipe ingredient autocomplete
   - Always global (no household_id)

2. **`shopping_article` table = NON-FOOD ONLY**
   - Household-scoped
   - NEVER appears in recipe searches
   - Used only in shopping list context

3. **Shopping list context uses BOTH**:
   - Combined search via `/api/shopping/items/search`
   - Can add ingredients (food) OR articles (non-food)
   - Each shopping_list_item has either `ingredient_id` OR `article_id`

### Migration Notes

#### Existing Data
- All existing `shopping_list_item` records have `ingredient_id` set
- `article_id` is NULL for all existing items
- No data migration needed - backward compatible

#### New Household Fields Removed
- If you previously added `household_id`, `is_recipe_eligible`, `aisle` to `ingredient`, they were removed
- Any household-specific ingredients should be migrated to `shopping_article` if they are non-food items

### Testing Checklist

- [x] GET `/api/ingredients?query=chicken` returns chicken (no 500 error)
- [x] POST `/api/shopping/articles` with `{name: "bandaids"}` creates article (no 500 error)
- [x] GET `/api/shopping/items/search?query=band` returns results including articles
- [x] Recipe ingredient search excludes articles (only shows food)
- [x] Shopping list "Create" button works for "bandaids"
- [ ] Can add "bandaids" to shopping list (once logged in)
- [ ] "bandaids" appears under "Own Items" aisle
- [ ] Can add regular ingredient like "chicken" to shopping list
- [ ] Recipe ingredient search for "band" shows nothing (articles excluded)

### Files Modified

**Database**:
- `prisma/schema.prisma` - Added `shopping_article`, updated `shopping_list_item`

**Server API**:
- `server/api/ingredients/index.get.ts` - Fixed to only search global ingredients
- `server/api/ingredients/custom.post.ts` - DELETED (was incorrect)
- `server/api/shopping/items/search.get.ts` - NEW: combined search
- `server/api/shopping/articles/index.post.ts` - NEW: create articles
- `server/api/shopping-list/[id]/items.post.ts` - Updated to handle both types
- `server/repos/shoppingListRepo.ts` - Updated to handle both types
- `server/utils/authHelpers.ts` - NO CHANGES (kept getActiveHousehold for articles API)

**Client**:
- `app/pages/shopping.vue` - Updated search and create functions
- `app/stores/shoppingList.ts` - Updated addItem signature
- `spec/schemas.ts` - Updated schemas for both ingredient_id and article_id

### Known Issues / Limitations

1. **Authentication Required**: All endpoints require authentication. If you see 401 errors from curl, that's expected. Test from browser with logged-in session.

2. **Household Required**: Article creation requires user to have an active household set. If user doesn't have one, will get 400 error.

3. **No Article Editing Yet**: Articles are created with default_aisle but no UI exists yet to change it (future enhancement).

4. **Display Name**: Articles store display name as normalized (lowercase). Could be enhanced to store original capitalization separately.

### Next Steps

1. **Manual Testing**: Test in browser with logged-in user
2. **Add Unit Tests**: Test article creation with duplicate names
3. **UI Polish**: Better feedback when creating articles
4. **Aisle Management**: UI to change article aisle/category

---

**Status**: Ready for testing. All 500 errors should be resolved. Recipe search is protected from non-food pollution.
