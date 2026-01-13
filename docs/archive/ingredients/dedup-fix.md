# Ingredient Case-Insensitive Duplicate Fix

## Problem
The ingredient database had case-insensitive duplicates (e.g., "Cucumber" and "cucumber") appearing as separate items in searches and dropdowns throughout the app (shopping list, recipe edit, etc.).

## Root Cause
The `import-off-ingredients.ts` script was using non-existent schema fields (`canonical_name`, `slug`, `off_id`) instead of the actual `name` field. This caused:
1. The script to fail silently or behave unpredictably
2. No case-insensitive deduplication during import
3. Multiple case variants of the same ingredient to be created

## Solution

### 1. Fixed Import Script (`scripts/import-off-ingredients.ts`)
- **Corrected schema usage**: Now uses `name` field (the only text field in the schema)
- **Case-insensitive deduplication**: During parsing, all ingredients are deduplicated by lowercase name
- **Proper capitalization**: Ingredients are stored with Title Case (e.g., "Cucumber", "Olive Oil")
- **Built-in cleanup**: The script now checks for and merges existing duplicates before importing
- **Alias system**: Case variants and duplicates are converted to aliases pointing to the canonical ingredient

### 2. Created Deduplication Script (`scripts/dedup-ingredients.ts`)
- Standalone script to clean up existing duplicates
- Finds all case-insensitive duplicates
- Keeps the oldest entry as canonical
- Converts duplicates to aliases
- Updates all foreign key references (recipe_ingredient, shopping_list_item, ingredient_tag)
- Safely deletes duplicate rows

### 3. Search API Already Correct
The `/api/ingredients` endpoint was already using case-insensitive search (`mode: 'insensitive'`), so no changes needed there.

## Usage

### To clean up existing duplicates:
```bash
npm run dedup:ingredients
```

### To re-import ingredients (with built-in dedup):
```bash
npm run import:ingredients
```

## Technical Details

### Schema (Correct)
```prisma
model ingredient {
  id                 String               @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  name               String               @unique
  default_unit       Unit?
  source             IngredientSource?    @default(OFF)
  is_core            Boolean?             @default(true)
  // ... relations
}
```

### Deduplication Strategy
1. **During Import**:
   - Parse OFF taxonomy into a Map keyed by lowercase name
   - Automatically merge variants during parsing
   - Check database for existing entries using case-insensitive queries
   - Update or insert with proper Title Case

2. **Foreign Key Updates**:
   ```sql
   UPDATE recipe_ingredient SET ingredient_id = $canonical WHERE ingredient_id = $duplicate;
   UPDATE shopping_list_item SET ingredient_id = $canonical WHERE ingredient_id = $duplicate;
   UPDATE ingredient_tag SET ingredient_id = $canonical WHERE ingredient_id = $duplicate 
     ON CONFLICT DO NOTHING;
   ```

3. **Alias Creation**:
   - Duplicate names are stored in `ingredient_alias` table
   - Points to the canonical ingredient via `ingredient_id`
   - Search API already checks aliases

## Impact
- ✅ No more "Cucumber" and "cucumber" appearing separately
- ✅ Search results show each ingredient only once
- ✅ Recipe edit and shopping list use consistent naming
- ✅ All existing data preserved via aliases
- ✅ Foreign key integrity maintained

## Prevention
The new import script ensures this cannot happen again:
- Case-insensitive deduplication is built into the parsing phase
- Database queries use `mode: 'insensitive'` for all lookups
- Cleanup runs automatically before each import
