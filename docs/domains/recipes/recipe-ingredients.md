# Recipe Ingredient Management - Complete

## Overview
Modern, card-based ingredient management system with automatic serving size scaling for recipes.

## What Changed

### Database Schema
**Recipe table:**
- Added `base_servings` (INTEGER, default 4): Base serving size recipe was created for

**Recipe Ingredient table:**
- Changed `quantity` from FLOAT to NUMERIC(10,3): Precise decimal storage

### API Endpoints

**POST /api/recipes/[id]/ingredients**
Add ingredient to recipe
```typescript
Body: {
  ingredient_id: string;
  quantity: number; // base amount
  unit: Unit;
  note?: string;
}
Returns: { id, recipe_id, ingredient_id, quantity, unit, note, ingredient }
```

**PATCH /api/recipes/[id]/ingredients/[recipeIngredientId]**
Update ingredient (quantity, unit, or note)
```typescript
// recipeIngredientId format: "{recipeId}-{ingredientId}"
Body: {
  quantity?: number;
  unit?: Unit;
  note?: string | null;
}
```

**DELETE /api/recipes/[id]/ingredients/[recipeIngredientId]**
Remove ingredient from recipe
```typescript
Returns: { success: true }
```

**PATCH /api/recipes/[id]**
Updated to accept `base_servings` field

### Components

**`app/pages/recipes/[id]/edit.vue`**
Complete recipe edit page with:
- Basic info editing (title, source_url, instructions)
- Servings control
- Ingredient search and add
- Ingredient cards grid
- Auto-save (2s debounce)
- Save status indicator

**`app/components/recipe/ServingsControl.vue`**
Dual input control:
- Base servings (stored in DB)
- Current servings (client-side preview only)

**`app/components/recipe/AddIngredientSearch.vue`**
Ingredient addition widget:
- Search with autocomplete (300ms debounce)
- Dropdown results
- Add form with quantity/unit/note
- Auto-focus quantity after selecting ingredient

**`app/components/recipe/IngredientCard.vue`**
Individual ingredient card:
- Displays scaled quantity prominently
- Shows base amount as subtle secondary text (only when scaled)
- Inline editing for quantity, unit, note
- Remove button (hover to reveal)
- Saving indicator

## Serving Size Scaling

### Logic
```typescript
scaledAmount = baseAmount * (currentServings / baseServings)
```

**Example:**
- Base servings: 4
- Base amount: 200g tomatoes
- Current servings: 8
- Scaled amount: 400g tomatoes

### Display
**Primary:** Scaled amount (400 g)
**Secondary:** Base amount in gray, smaller font (200 g base) - only shown if currentServings ≠ baseServings

**Storage:**
- `recipe.base_servings`: Saved to DB
- `recipe_ingredient.quantity`: Saved at base serving size
- Current servings: Client-side state only (not persisted)

## User Flow

1. Navigate to `/recipes/[id]/edit`
2. See recipe title, instructions, current ingredients
3. Adjust base servings (e.g., 4) or current servings (e.g., 8) for preview
4. All ingredient cards update to show scaled amounts
5. Click "Add Ingredient" search
6. Type "tom" → see "tomato"
7. Click "tomato" → form appears with quantity/unit/note inputs
8. Enter 400, select "g", add note "diced"
9. Click "Add" → new card appears in grid
10. Click "400" on card → inline edit to "500"
11. Blur → auto-saves
12. Title/instructions auto-save 2s after typing stops
13. Click "Done Editing" → navigate back to recipe view

## Features

### Inline Editing
- **Quantity**: Click number → input field → blur/Enter to save
- **Unit**: Click unit → dropdown → blur/Esc to save
- **Note**: Click note or "+ Add note" → input → blur/Enter to save
- Visual feedback: Blue border during edit, spinner when saving

### Auto-save
- Recipe basic info: 2-second debounce after typing
- Ingredient updates: Immediate on blur/Enter
- Status indicators: "Saving..." and "Saved ✓"

### Validation
- Quantity must be > 0
- Base servings must be > 0
- No minimum ingredients required (can save empty recipe)

### Responsive
- Desktop: 3-column ingredient grid
- Tablet: 2-column grid
- Mobile: 1-column list

### Keyboard Support
- Enter in search → focus quantity
- Enter in quantity → add ingredient
- Esc → cancel inline edit
- Tab navigation through fields

## Technical Details

### Recipe Ingredient ID Format
Junction table addressed by composite ID: `"{recipeId}-{ingredientId}"`
Example: `"c6016b2d-f7e7-4656-a1b9-45cd34ee47ed-1a2b3c4d-5e6f-7g8h-9i0j-k1l2m3n4o5p6"`

### Decimal Precision
NUMERIC(10,3) allows:
- Up to 7 digits before decimal
- 3 digits after decimal
- Examples: 0.125, 1.5, 450, 1234.567

### Scaling Calculation
Client-side only, reactive computed property:
```typescript
displayQuantity = baseQuantity * (currentServings / baseServings)
```

Displayed with smart formatting:
- Whole numbers: "4"
- Decimals: "1.5", "0.25" (trailing zeros removed)

### Unit Display
Stored as enum (G, KG, ML, etc.), displayed as lowercase (g, kg, ml)

## Out of Scope (Not Implemented)
- Recipe detail page updates (showing scaled ingredients)
- Drag-to-reorder ingredients
- Prep/cook time fields
- Bulk ingredient operations
- Recipe duplication
- Print view

## Testing Checklist

- [ ] Load recipe edit page
- [ ] Edit title, source URL, instructions → auto-saves
- [ ] Change base servings → saves to DB
- [ ] Change current servings → ingredients scale in real-time
- [ ] Add ingredient via search
- [ ] Inline edit quantity → saves
- [ ] Inline edit unit → saves
- [ ] Add/edit note → saves
- [ ] Remove ingredient → confirms and deletes
- [ ] Base amount shows only when scaled (currentServings ≠ baseServings)
- [ ] Navigate back to recipe view

## Example Recipe

**Base Recipe (4 servings):**
- 200g tomatoes, diced
- 100g pasta
- 50ml olive oil

**Scaled to 8 servings:**
- 400g tomatoes (200g base)
- 200g pasta (100g base)
- 100ml olive oil (50ml base)

**Scaled to 2 servings:**
- 100g tomatoes (200g base)
- 50g pasta (100g base)
- 25ml olive oil (50ml base)

## API Usage Examples

```bash
# Add ingredient
curl -X POST http://localhost:3000/api/recipes/RECIPE_ID/ingredients \
  -H "Cookie: session_token=TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"ingredient_id":"ING_ID","quantity":200,"unit":"G","note":"diced"}'

# Update ingredient quantity
curl -X PATCH http://localhost:3000/api/recipes/RECIPE_ID/ingredients/RECIPE_ID-ING_ID \
  -H "Cookie: session_token=TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"quantity":250}'

# Delete ingredient
curl -X DELETE http://localhost:3000/api/recipes/RECIPE_ID/ingredients/RECIPE_ID-ING_ID \
  -H "Cookie: session_token=TOKEN"

# Update recipe base servings
curl -X PATCH http://localhost:3000/api/recipes/RECIPE_ID \
  -H "Cookie: session_token=TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"base_servings":6}'
```

## Code Comments

Key sections have inline comments explaining:
- Scaling calculation logic
- Display formatting
- Composite ID handling
- Auto-save debouncing

Ready for use! Navigate to any recipe and click "Edit" to access the new interface.
