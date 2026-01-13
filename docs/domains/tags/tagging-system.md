# Unified Tagging System

## Overview
JuiceFuel has ONE unified tagging system shared across recipes, ingredients, and shopping list items.

## Schema Changes

### Database Migrations Applied
```sql
-- Add tagging fields to tag table
ALTER TABLE tag 
  ADD COLUMN kind TEXT,
  ADD COLUMN scope TEXT DEFAULT 'GLOBAL',
  ADD COLUMN household_id UUID REFERENCES household(id) ON DELETE CASCADE;

CREATE INDEX tag_kind_idx ON tag(kind);
CREATE INDEX tag_scope_idx ON tag(scope);
CREATE INDEX tag_household_id_idx ON tag(household_id);

-- Create join tables
CREATE TABLE ingredient_tag (
  ingredient_id UUID NOT NULL REFERENCES ingredient(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tag(id) ON DELETE CASCADE,
  PRIMARY KEY (ingredient_id, tag_id)
);
CREATE INDEX ingredient_tag_tag_id_idx ON ingredient_tag(tag_id);

CREATE TABLE shopping_list_item_tag (
  shopping_list_item_id UUID NOT NULL REFERENCES shopping_list_item(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tag(id) ON DELETE CASCADE,
  PRIMARY KEY (shopping_list_item_id, tag_id)
);
CREATE INDEX shopping_list_item_tag_tag_id_idx ON shopping_list_item_tag(tag_id);
```

## Tag Structure

**Fields:**
- `id` (UUID): Primary key
- `name` (string): Display label (e.g., "Mexican", "Vegan")
- `slug` (string): Normalized unique identifier (e.g., "mexican", "vegan")
- `kind` (string, optional): Category (CUISINE, DIET, ALLERGEN, CATEGORY, PRIORITY, etc.)
- `scope` (GLOBAL | HOUSEHOLD): Visibility scope
- `household_id` (UUID, optional): Required if scope = HOUSEHOLD
- `created_at`, `updated_at`: Timestamps

**Scope Rules:**
- `GLOBAL`: Visible to all users (system tags)
- `HOUSEHOLD`: Visible only to household members

## Tagging Scope

### ✅ Full Tagging (Recipes)
Recipes support rich tagging:
- **CUISINE**: mexican, asian, french, italian
- **FLAVOR**: spicy, sweet, refreshing, savory
- **DIET**: vegan, keto, paleo, vegetarian
- **ALLERGEN**: gluten-free, nut-free, dairy-free
- **TECHNIQUE**: grilled, slow-cooked, baked
- **TIME**: quick, weekend, under-30-min
- **COST**: cheap, premium, budget

### ✅ Structural Tagging (Shopping List Items)
Shopping list items use practical tags:
- **CATEGORY**: produce, dairy, bakery, household
- **PRIORITY**: now, soon, optional

### ✅ Minimal Tagging (Ingredients)
Ingredients support limited tagging:
- **CATEGORY**: vegetable, protein, pantry
- **STORAGE**: fridge, freezer, pantry
- **ALLERGEN**: gluten, nuts, lactose

### ❌ No Tagging
- Meal planner entries
- Households
- User profiles

## API Endpoints

### Search Tags
```
GET /api/tags?query=<search>&kinds=<kinds>&household_id=<id>&limit=<n>
```

**Query Parameters:**
- `query` (optional): Text search on tag names
- `kinds` (optional): Comma-separated kinds to filter (e.g., "CUISINE,DIET")
- `household_id` (required): Household context
- `limit` (optional, default 20, max 100): Result limit

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "Mexican",
    "slug": "mexican",
    "kind": "CUISINE",
    "scope": "GLOBAL"
  }
]
```

**Ordering:**
1. Tags starting with query
2. Tags containing query
3. Alphabetical

### Create Tag
```
POST /api/tags
Content-Type: application/json

{
  "label": "Mexican",
  "kind": "CUISINE",
  "scope": "GLOBAL"
}
```

**For household-scoped tags:**
```json
{
  "label": "Weeknight Favorite",
  "kind": "TIME",
  "scope": "HOUSEHOLD",
  "household_id": "uuid"
}
```

**Response:** Same as search result (returns existing if slug matches)

### Attach/Detach Tags

**Recipes:**
```
POST   /api/recipes/:recipe_id/tags
       Body: { "tag_id": "uuid" }

DELETE /api/recipes/:recipe_id/tags/:tag_id
```

**Ingredients:**
```
POST   /api/ingredients/:ingredient_id/tags
       Body: { "tag_id": "uuid" }

DELETE /api/ingredients/:ingredient_id/tags/:tag_id
```

**Shopping List Items:**
```
POST   /api/shopping-list-items/:item_id/tags
       Body: { "tag_id": "uuid" }

DELETE /api/shopping-list-items/:item_id/tags/:tag_id
```

**All operations are idempotent.**

## Recipe Filtering

**Updated `recipeRepo.findMany()`** now supports tag filtering:

```typescript
recipeRepo.findMany(where, tagIds)
```

**Filter Semantics:** AND (recipe must have ALL specified tags)

**Example:**
```typescript
// Find recipes tagged with BOTH "mexican" AND "vegan"
const recipes = await recipeRepo.findMany(
  { recipe_library_id: libraryId },
  [mexicanTagId, veganTagId]
);
```

**Response includes tags:**
```json
{
  "id": "uuid",
  "title": "Vegan Tacos",
  "tags": [
    {
      "tag_id": "uuid-1",
      "recipe_id": "uuid",
      "tag": {
        "id": "uuid-1",
        "name": "Mexican",
        "slug": "mexican",
        "kind": "CUISINE"
      }
    }
  ]
}
```

## Security & Access Control

**Tag Visibility:**
- Users can see GLOBAL tags + HOUSEHOLD tags for their households
- Tag creation enforces household membership for HOUSEHOLD scope
- Attach/detach operations verify resource ownership via household

**Enforcement:**
- All endpoints use `requireAuth()`
- Household membership checked via `household_member` table
- Shopping list and recipe operations validate household access

## Usage Examples

### 1. Search for cuisine tags
```bash
curl -H "Cookie: session_token=TOKEN" \
  "http://localhost:3000/api/tags?query=mex&kinds=CUISINE&household_id=HH_ID"
```

### 2. Create a new tag
```bash
curl -X POST http://localhost:3000/api/tags \
  -H "Cookie: session_token=TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "label": "Spicy",
    "kind": "FLAVOR",
    "scope": "GLOBAL"
  }'
```

### 3. Tag a recipe
```bash
curl -X POST http://localhost:3000/api/recipes/RECIPE_ID/tags \
  -H "Cookie: session_token=TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"tag_id": "TAG_ID"}'
```

### 4. Filter recipes by multiple tags
```bash
# This would be done in the recipe service/controller:
const mexicanTagId = "...";
const veganTagId = "...";

const recipes = await recipeRepo.findMany(
  { recipe_library_id: libraryId },
  [mexicanTagId, veganTagId]
);
```

### 5. Untag a recipe
```bash
curl -X DELETE http://localhost:3000/api/recipes/RECIPE_ID/tags/TAG_ID \
  -H "Cookie: session_token=TOKEN"
```

### 6. Tag a shopping list item (for aisle grouping)
```bash
curl -X POST http://localhost:3000/api/shopping-list-items/ITEM_ID/tags \
  -H "Cookie: session_token=TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"tag_id": "PRODUCE_TAG_ID"}'
```

## Implementation Notes

**Slug Generation:**
```typescript
const slug = label
  .toLowerCase()
  .trim()
  .replace(/[^\w\s-]/g, '')
  .replace(/\s+/g, '-')
  .replace(/-+/g, '-');
```

**Deduplication:**
- Uses `upsert` with `slug` as unique constraint
- If tag with same slug exists, returns existing tag
- Prevents duplicate tags with different casing/spacing

**Tag Filtering (AND semantics):**
- Prisma query filters recipes with at least one matching tag
- In-memory filter ensures ALL tags are present
- Performance: acceptable for typical tag counts (<10)

**Files Modified:**
- `prisma/schema.prisma` (auto-generated from DB)
- `server/repos/recipeRepo.ts` (added tag filtering)
- `server/api/tags/index.get.ts` (search)
- `server/api/tags/index.post.ts` (create)
- `server/api/recipes/[id]/tags/index.post.ts` (attach)
- `server/api/recipes/[id]/tags/[tagId].delete.ts` (detach)
- `server/api/ingredients/[id]/tags/index.post.ts` (attach)
- `server/api/ingredients/[id]/tags/[tagId].delete.ts` (detach)
- `server/api/shopping-list-items/[id]/tags/index.post.ts` (attach)
- `server/api/shopping-list-items/[id]/tags/[tagId].delete.ts` (detach)

## Future Enhancements

**Shopping List Grouping:**
- Group items by CATEGORY tags (produce, dairy, etc.)
- Sort by PRIORITY tags (now, soon, optional)
- UI shows items in sections

**Recipe Discovery:**
- Search by text + filter by multiple tags
- Tag-based recommendations
- Popular tags widget

**Ingredient Management:**
- Filter pantry inventory by CATEGORY/STORAGE tags
- Allergen warnings based on ingredient tags
- Smart substitution suggestions

Ready for use! The unified tagging system is now operational across recipes, ingredients, and shopping list items.
