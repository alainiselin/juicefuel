# JuiceFuel Implementation Summary

## What Was Added

### 1. Specification Files (spec/)
- **domain.md**: Core entities, invariants, and business rules for MVP
- **schemas.ts**: Zod schemas + exported TypeScript types for API I/O
- **openapi.yaml**: OpenAPI 3.1 specification describing all endpoints

### 2. Server Structure (server/)

#### Utilities
- **server/utils/prisma.ts**: Singleton Prisma client for database access

#### Repository Layer (server/repos/)
- **recipeRepo.ts**: Prisma queries for recipes (CRUD + search)
- **mealPlanRepo.ts**: Prisma queries for meal plan entries (CRUD + date range)

#### Service Layer (server/services/)
- **recipeService.ts**: Business logic for recipe management
- **mealPlanService.ts**: Business logic for meal planning
- **shoppingListService.ts**: Shopping list generation with aggregation logic

#### API Endpoints (server/api/)
- **recipes/**
  - `index.get.ts`: GET /api/recipes (list/search)
  - `index.post.ts`: POST /api/recipes (create)
  - `[id].get.ts`: GET /api/recipes/:id (get one)
  - `[id].patch.ts`: PATCH /api/recipes/:id (update)
  - `[id].delete.ts`: DELETE /api/recipes/:id (delete)

- **meal-plan/**
  - `index.get.ts`: GET /api/meal-plan (list by date range)
  - `index.post.ts`: POST /api/meal-plan (create entry)
  - `[id].patch.ts`: PATCH /api/meal-plan/:id (update)
  - `[id].delete.ts`: DELETE /api/meal-plan/:id (delete)

- **shopping-list/**
  - `index.get.ts`: GET /api/shopping-list (generate aggregated list)

### 3. Frontend (app/)

#### Composables
- **composables/useApi.ts**: Typed wrapper around $fetch with error handling

#### Stores (Pinia)
- **stores/recipes.ts**: Recipe state management
- **stores/mealPlan.ts**: Meal plan state management
- **stores/shoppingList.ts**: Shopping list state management

#### Pages
- **pages/index.vue**: Home page with navigation
- **pages/recipes.vue**: Recipe list + create/edit modal
- **pages/plan.vue**: Meal plan with date range selector
- **pages/shopping-list.vue**: Shopping list generator

### 4. Tests
- **server/services/shoppingListService.test.ts**: Unit tests for ingredient aggregation
  - Same ingredient/unit sums correctly
  - Different units don't mix
  - Null quantities handled properly
  - Edge cases covered

## How to Run

### Development Server
```bash
# Install dependencies (if not already done)
npm install

# Generate Prisma client
npx prisma generate

# Run development server
npm run dev
```

Visit http://localhost:3000

### Run Tests
```bash
# Run tests once
npm test -- --run

# Run tests in watch mode
npm test
```

## Example API Usage

### Prerequisites
You'll need:
1. A `household_id` (UUID)
2. A `recipe_library_id` (UUID - from recipe_library table)
3. A `meal_plan_id` (UUID - from meal_plan table)
4. Some `ingredient_id`s (UUIDs - from ingredient table)

For testing, you can create these manually in your database or through SQL:

```sql
-- Create test household
INSERT INTO household (id, name) VALUES ('11111111-1111-1111-1111-111111111111', 'Test Household');

-- Create recipe library
INSERT INTO recipe_library (id, household_id, name) 
VALUES ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'My Recipes');

-- Create meal plan
INSERT INTO meal_plan (id, household_id) 
VALUES ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111');

-- Create ingredients
INSERT INTO ingredient (id, name, default_unit) VALUES 
('44444444-4444-4444-4444-444444444444', 'Flour', 'G'),
('55555555-5555-5555-5555-555555555555', 'Sugar', 'G'),
('66666666-6666-6666-6666-666666666666', 'Eggs', 'PIECE');
```

### Recipe Endpoints

#### List/Search Recipes
```bash
# List all recipes
curl http://localhost:3000/api/recipes

# Search recipes by title
curl "http://localhost:3000/api/recipes?query=pasta"

# Filter by recipe library
curl "http://localhost:3000/api/recipes?recipe_library_id=22222222-2222-2222-2222-222222222222"
```

#### Create Recipe
```bash
curl -X POST http://localhost:3000/api/recipes \
  -H "Content-Type: application/json" \
  -d '{
    "recipe_library_id": "22222222-2222-2222-2222-222222222222",
    "title": "Simple Pancakes",
    "source_url": "https://example.com/pancakes",
    "instructions_markdown": "Mix ingredients and cook on griddle.",
    "ingredients": [
      {
        "ingredient_id": "44444444-4444-4444-4444-444444444444",
        "quantity": 200,
        "unit": "G",
        "note": "all-purpose"
      },
      {
        "ingredient_id": "55555555-5555-5555-5555-555555555555",
        "quantity": 50,
        "unit": "G"
      },
      {
        "ingredient_id": "66666666-6666-6666-6666-666666666666",
        "quantity": 2,
        "unit": "PIECE"
      }
    ]
  }'
```

#### Get Recipe
```bash
curl http://localhost:3000/api/recipes/{recipe_id}
```

#### Update Recipe
```bash
curl -X PATCH http://localhost:3000/api/recipes/{recipe_id} \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated Title",
    "instructions_markdown": "Updated instructions"
  }'
```

#### Delete Recipe
```bash
curl -X DELETE http://localhost:3000/api/recipes/{recipe_id}
```

### Meal Plan Endpoints

#### Get Meal Plan Entries
```bash
curl "http://localhost:3000/api/meal-plan?meal_plan_id=33333333-3333-3333-3333-333333333333&from=2025-01-01&to=2025-01-07"
```

#### Create Meal Plan Entry
```bash
curl -X POST http://localhost:3000/api/meal-plan \
  -H "Content-Type: application/json" \
  -d '{
    "meal_plan_id": "33333333-3333-3333-3333-333333333333",
    "date": "2025-01-01",
    "slot": "BREAKFAST",
    "recipe_id": "{recipe_id_from_create_response}"
  }'
```

#### Update Meal Plan Entry
```bash
curl -X PATCH http://localhost:3000/api/meal-plan/{entry_id} \
  -H "Content-Type: application/json" \
  -d '{
    "slot": "DINNER"
  }'
```

#### Delete Meal Plan Entry
```bash
curl -X DELETE http://localhost:3000/api/meal-plan/{entry_id}
```

### Shopping List Endpoint

#### Generate Shopping List
```bash
curl "http://localhost:3000/api/shopping-list?meal_plan_id=33333333-3333-3333-3333-333333333333&from=2025-01-01&to=2025-01-07"
```

Returns aggregated ingredients from all meal plan entries in the date range, grouped by ingredient name and unit.

## Architecture Notes

### Validation
- All external input is validated with Zod schemas
- Consistent error responses with status codes (400, 404, etc.)

### Service/Repo Pattern
- **Repos**: Only Prisma queries, no business logic
- **Services**: Business logic, calls repos, no direct Prisma access
- **Endpoints**: Validation + service calls, minimal logic

### Shopping List Aggregation
- Pure function `aggregateIngredients()` makes testing easy
- Groups by ingredient name + unit
- Sums quantities only for matching units
- Tracks which recipes contributed to each item

### Frontend State
- Pinia stores manage domain state
- `useApi()` composable provides typed API calls
- Pages are minimal, delegate to stores

## Next Steps

To complete a working prototype, you would need to:

1. **Database Setup**: Run migrations and seed data
2. **Authentication**: Add user context (currently assumes single household)
3. **Ingredient Management**: Add CRUD endpoints for ingredients
4. **Enhanced UI**: Better forms, validation feedback, loading states
5. **Recipe Ingredients UI**: Better interface for adding/editing ingredients in recipes
6. **Calendar View**: Visual calendar for meal planning
7. **Recipe Scaling**: Support serving size adjustments
8. **Export**: Print/export shopping list

## Testing

The aggregation logic is fully tested with edge cases:
- Same ingredient/unit aggregates correctly
- Different units remain separate
- Null quantities handled properly
- Multiple recipes tracked per ingredient
