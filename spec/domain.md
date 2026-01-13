# JuiceFuel Domain Model - MVP

## Core Entities

### Recipe
A recipe is a named collection of ingredients with instructions. Recipes belong to a recipe library (scoped by household).

**Attributes:**
- `id`: UUID
- `title`: string (required)
- `source_url`: optional string (URL reference)
- `instructions_markdown`: optional markdown text
- `ingredients`: array of RecipeIngredient
- `recipe_library_id`: UUID (household scope)

**Invariants:**
- Title must not be empty
- Each ingredient in a recipe is unique (no duplicate ingredient_id within one recipe)

### Ingredient
A globally-scoped master list of ingredients. Used to normalize shopping lists.

**Attributes:**
- `id`: UUID
- `name`: string (unique)
- `default_unit`: optional Unit enum

**Invariants:**
- Name must be unique across system
- Name must not be empty

### RecipeIngredient
Join entity linking Recipe ↔ Ingredient with quantity/unit.

**Attributes:**
- `recipe_id`: UUID
- `ingredient_id`: UUID
- `quantity`: optional float
- `unit`: optional Unit enum
- `note`: optional string (e.g., "chopped", "to taste")

**Invariants:**
- If quantity is provided, it must be > 0
- Unit should be provided if quantity exists (but nullable for "to taste" cases)

### MealPlanEntry (meal_slot in schema)
A single slot in a meal plan: a date + meal slot (breakfast/lunch/dinner/snack) + recipe.

**Attributes:**
- `id`: UUID
- `meal_plan_id`: UUID
- `date`: Date (no time component)
- `slot`: SlotType enum (BREAKFAST, LUNCH, DINNER, SNACK, OTHER)
- `recipe_id`: UUID

**Invariants:**
- Each (meal_plan_id, date, slot) tuple must be unique (one recipe per slot per day)
- Date must be valid

### ShoppingListItem (Aggregated)
For the MVP shopping list generation: items are dynamically aggregated from meal plan entries within a date range.

**Aggregation Logic:**
- For each MealPlanEntry in date range [from, to]:
  - Get associated recipe
  - For each ingredient in recipe:
    - Group by (ingredient.name, unit)
    - Sum quantities with matching unit
    - If unit differs or is null, list separately

**Output Attributes (aggregated):**
- `ingredient_name`: string
- `total_quantity`: float (summed)
- `unit`: Unit enum or null
- `recipes`: array of recipe titles that contributed to this line

**Invariants:**
- Do NOT sum quantities across different units
- Null quantities are listed but not summed

## Enums

### SlotType
- BREAKFAST
- LUNCH
- DINNER
- SNACK
- OTHER

### Unit
- G, KG (grams, kilograms)
- ML, L (milliliters, liters)
- TBSP, TSP (tablespoon, teaspoon)
- CUP
- PIECE
- PACKAGE
- OTHER

## Business Rules

1. **Recipe Management:**
   - Recipes can be created, updated, deleted
   - Deleting a recipe removes it from future meal plan slots (handled by DB cascade or service logic)
   - Searching recipes is case-insensitive on title

2. **Meal Planning:**
   - Users can assign one recipe per (date, slot) combination
   - Updating a meal slot replaces the recipe
   - Date range queries return all entries within [from, to] inclusive

3. **Shopping List Generation:**
   - Shopping list is read-only generated view (not persisted for MVP)
   - Aggregates ingredients from all meal plan entries in specified date range
   - Groups by ingredient name + unit
   - Different units for same ingredient remain separate lines
   - Missing quantity/unit are listed but not aggregated numerically

## Out of Scope for MVP
- User authentication (assume single household context for now)
- Persistent shopping lists (only dynamic generation)
- Recipe scaling/serving sizes
- Ingredient substitutions
- Nutritional information
- Recipe ratings/comments
