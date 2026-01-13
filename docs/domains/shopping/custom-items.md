# Custom Shopping Items Implementation

## Overview
Users can now create custom shopping items (e.g., "bandaids", "paper towels") directly from the shopping list search interface. These custom items are household-scoped and do NOT appear in recipe ingredient searches, preventing non-food items from polluting recipe autocomplete.

## Database Changes

### New Fields in `ingredient` Table
- **household_id** (uuid, nullable): FK to household.id
  - NULL for global OFF ingredients
  - Set to household ID for custom items
- **is_recipe_eligible** (boolean, default true): 
  - true for food/cooking ingredients
  - false for custom shopping items (bandaids, household goods, etc.)
- **aisle** (string, nullable): Direct aisle assignment
  - Defaults to 'own-items' for custom items
  - Can be changed to existing AISLE tags later

### Indexes Added
- `ingredient(household_id)` - for scoped queries
- `ingredient(is_recipe_eligible)` - for recipe filtering
- `ingredient(aisle)` - for categorization
- `ingredient(name)` - for search optimization

## API Changes

### 1. GET /api/ingredients (Updated)
Enhanced ingredient search with household scoping and recipe filtering.

**New Query Parameters:**
- `recipe_only=true|false` (default: false)
  - When true, only returns ingredients with `is_recipe_eligible=true`
  - Used by recipe ingredient autocomplete

**Scoping Behavior:**
- Always includes global ingredients (household_id IS NULL)
- Also includes household-specific ingredients (household_id = user's active household)
- Maintains existing search logic (startsWith → aliases → contains)

**Example Usage:**
```javascript
// Shopping list search (includes all)
$fetch('/api/ingredients?query=band&limit=10')

// Recipe ingredient search (excludes custom items)
$fetch('/api/ingredients?query=tomato&limit=10&recipe_only=true')
```

### 2. POST /api/ingredients/custom (New)
Creates household-scoped custom shopping items.

**Request Body:**
```json
{
  "name": "bandaids",
  "aisle": "care-health" // optional, defaults to "own-items"
}
```

**Response:**
```json
{
  "id": "uuid",
  "name": "bandaids",
  "default_unit": "PIECE",
  "aisle": "own-items",
  "household_id": "uuid",
  "is_recipe_eligible": false
}
```

**Deduplication Logic:**
1. If household already has item with same name → return existing
2. If global ingredient exists with same name → return global instead
3. Otherwise → create new household-scoped item

**Created Item Properties:**
- `name`: normalized (trim, lowercase, collapse spaces)
- `household_id`: user's active household
- `is_recipe_eligible`: false
- `aisle`: provided value or 'own-items'
- `source`: USER
- `default_unit`: PIECE
- `is_core`: false

## UI Changes

### Shopping List Search (app/pages/shopping.vue)
When search yields no results, shows a "Create" option:

```
┌──────────────────────────────────────┐
│ + Create "bandaids"                  │
│   Add to Own Items                   │
└──────────────────────────────────────┘
```

**Flow:**
1. User types "bandaids" in search
2. No matches found → "Create" button appears
3. User clicks → creates custom ingredient via POST /api/ingredients/custom
4. Immediately adds created item to shopping list
5. Search clears and refocuses for fast entry

### Recipe Ingredient Search (app/components/recipe/AddIngredientSearch.vue)
Now passes `recipe_only=true` parameter to ingredient search:

```javascript
searchResults.value = await $fetch('/api/ingredients', {
  params: {
    query: searchQuery.value,
    limit: 10,
    recipe_only: 'true', // NEW: excludes custom items
  },
});
```

## Household Scoping

### Rules
- **Global ingredients** (household_id=NULL): visible to all households
- **Custom items** (household_id set): only visible to owning household
- Prevents cross-household pollution of custom items

### Example
```
Household A creates "bandaids"
→ Only visible in Household A's ingredient searches
→ Household B cannot see it
→ Household B can create their own "bandaids" if needed
```

## AISLE System Integration

### Available Aisles (from setup-aisle-tags.ts)
1. fruits-vegetables
2. bread-pastries
3. milk-cheese
4. meat-fish
5. ingredients-spices
6. grain-products
7. frozen-convenience
8. snacks-sweets
9. beverages
10. household
11. care-health
12. pet-supplies
13. home-garden
14. **own-items** (default for custom items)

Custom items default to 'own-items' but can be reassigned to any other aisle later (not implemented in V1).

## Testing Scenarios

### ✅ Test 1: Create Custom Item
1. Go to shopping list
2. Search for "bandaids"
3. Click "Create 'bandaids'"
4. Item should be created and added to list
5. Check database: household_id set, is_recipe_eligible=false, aisle='own-items'

### ✅ Test 2: Household Scoping
1. Create "test item" in Household A
2. Switch to Household B
3. Search for "test item" → should NOT appear in Household B
4. Switch back to Household A → should appear

### ✅ Test 3: Recipe Search Exclusion
1. Create "bandaids" custom item
2. Go to recipe editor
3. Try adding ingredient "band"
4. Should NOT see "bandaids" in autocomplete
5. Only recipe-eligible ingredients should appear

### ✅ Test 4: Global Ingredient Priority
1. Search for existing global ingredient (e.g., "tomato")
2. Try to create "tomato" as custom item
3. Should return existing global tomato instead of creating duplicate

### ✅ Test 5: No Shopping List UX Regression
- Card interactions unchanged
- Delete buttons work
- Long-press modal unchanged
- Checkbox toggling works
- Item editing works

## Migration Notes

### Existing Data
All existing ingredients automatically get:
- `household_id = NULL` (global)
- `is_recipe_eligible = true` (default)
- `aisle = NULL`

No data migration needed - defaults are safe and correct.

## Future Enhancements (Not in V1)

1. **Aisle Editing**: UI to change aisle for custom items
2. **Sharing**: Option to promote custom items to global catalog
3. **Suggestions**: Show popular household custom items as suggestions
4. **Categories**: Additional categorization beyond aisles
5. **Per-User Items**: Private items not shared with household

## Technical Details

### Auth Helper Addition
Added `getActiveHousehold()` helper to `server/utils/authHelpers.ts`:
- Fetches user's active_household_id
- Returns household object with id and name
- Throws 400 error if no active household set

### Name Normalization
All custom item names are normalized:
```javascript
const normalizedName = name
  .trim()
  .replace(/\s+/g, ' ')
  .toLowerCase();
```

Ensures consistent searching and deduplication.

## Files Changed

### Database
- `prisma/schema.prisma` - added fields and indexes to ingredient model

### API
- `server/api/ingredients/index.get.ts` - added household scoping and recipe_only filter
- `server/api/ingredients/custom.post.ts` - NEW custom item creation endpoint
- `server/utils/authHelpers.ts` - added getActiveHousehold helper

### UI
- `app/pages/shopping.vue` - added "Create" option in search results
- `app/components/recipe/AddIngredientSearch.vue` - added recipe_only=true parameter

## Success Criteria ✅

- [x] Custom items can be created from shopping list search
- [x] Custom items default to 'own-items' aisle
- [x] Household scoping works (items are isolated per household)
- [x] Recipe ingredient search excludes custom items
- [x] No regressions to shopping list card UX
- [x] Name normalization and deduplication works
- [x] Global ingredient priority works (no duplicate "tomato")
