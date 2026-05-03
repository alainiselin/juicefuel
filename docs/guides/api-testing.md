---
title: API Testing Guide
category: guide
status: stable
---

# API Testing Guide

How to test JuiceFuel API endpoints manually and programmatically.

## Prerequisites

### Required Test Data
You'll need:
1. A `household_id` (UUID)
2. A `recipe_library_id` (UUID - from recipe_library table)
3. A `meal_plan_id` (UUID - from meal_plan table)
4. Some `ingredient_id`s (UUIDs - from ingredient table)

See [[seeding-test-data]] for how to create test data.

### Test Users
Default seed data provides:
- **test@juicefuel.local** / password123
- **second@juicefuel.local** / password123

## Authentication

### Get Session Token

```bash
# Sign up
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email":"test@example.com",
    "password":"password123",
    "display_name":"Test User"
  }' \
  -c cookies.txt

# Or login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email":"test@juicefuel.local",
    "password":"password123"
  }' \
  -c cookies.txt

# Check session
curl http://localhost:3000/api/auth/session -b cookies.txt

# Logout
curl -X POST http://localhost:3000/api/auth/logout -b cookies.txt
```

## Recipe Endpoints

### List Recipes
```bash
# All recipes in user's households
curl http://localhost:3000/api/recipes -b cookies.txt

# Filter by library
curl "http://localhost:3000/api/recipes?recipe_library_id=LIBRARY_ID" -b cookies.txt

# Search by title
curl "http://localhost:3000/api/recipes?query=pasta" -b cookies.txt
```

### Create Recipe
```bash
curl -X POST http://localhost:3000/api/recipes \
  -H "Content-Type: application/json" \
  -b cookies.txt \
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
      }
    ]
  }'
```

### Get Recipe
```bash
curl http://localhost:3000/api/recipes/RECIPE_ID -b cookies.txt
```

### Update Recipe
```bash
curl -X PATCH http://localhost:3000/api/recipes/RECIPE_ID \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "title": "Updated Title",
    "instructions_markdown": "Updated instructions"
  }'
```

### Delete Recipe
```bash
curl -X DELETE http://localhost:3000/api/recipes/RECIPE_ID -b cookies.txt
```

### Generate AI Recipe Draft
```bash
curl -X POST http://localhost:3000/api/recipes/generate \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "household_id": "HOUSEHOLD_ID",
    "query": "quick high-protein pasta",
    "servings": 4
  }'
```

### Import Recipe Draft From URL
```bash
curl -X POST http://localhost:3000/api/recipes/generate/from-url \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "household_id": "HOUSEHOLD_ID",
    "url": "https://www.swissmilk.ch/de/rezepte-kochideen/rezepte/LM201005_18/spargel-cannelloni-mit-speck/",
    "servings": 4
  }'
```

### Save Generated Or Imported Draft
```bash
curl -X POST http://localhost:3000/api/recipes/generate/save \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "household_id": "HOUSEHOLD_ID",
    "recipe_library_id": "OWN_HOUSEHOLD_LIBRARY_ID",
    "draft": { "...": "paste draft from generate/from-url response" },
    "source_url": "https://example.com/original-recipe"
  }'
```

`recipe_library_id` must belong to the user's active household. Public libraries are readable by other households but not writable.

## Meal Plan Endpoints

### Get Meal Plan Entries
```bash
curl "http://localhost:3000/api/meal-plan?meal_plan_id=PLAN_ID&from=2025-01-01&to=2025-01-07" \
  -b cookies.txt
```

### Create Meal Plan Entry
```bash
curl -X POST http://localhost:3000/api/meal-plan \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "meal_plan_id": "33333333-3333-3333-3333-333333333333",
    "date": "2025-01-01",
    "slot": "BREAKFAST",
    "recipe_id": "RECIPE_ID"
  }'
```

### Update Meal Plan Entry
```bash
curl -X PATCH http://localhost:3000/api/meal-plan/ENTRY_ID \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "slot": "DINNER"
  }'
```

### Delete Meal Plan Entry
```bash
curl -X DELETE http://localhost:3000/api/meal-plan/ENTRY_ID -b cookies.txt
```

## Shopping List Endpoints

### Generate Shopping List
```bash
curl "http://localhost:3000/api/shopping-list?meal_plan_id=PLAN_ID&from=2025-01-01&to=2025-01-07" \
  -b cookies.txt
```

Returns aggregated ingredients from all meal plan entries in the date range.

## Ingredient Endpoints

### Search Ingredients
```bash
# Core ingredients only (default)
curl "http://localhost:3000/api/ingredients?query=tomat&limit=10" -b cookies.txt

# Include all ingredients
curl "http://localhost:3000/api/ingredients?query=tomat&limit=10&include_non_core=true" \
  -b cookies.txt
```

### Get Ingredient Details
```bash
curl http://localhost:3000/api/ingredients/INGREDIENT_ID -b cookies.txt
```

## Tag Endpoints

### Search Tags
```bash
# All tags
curl "http://localhost:3000/api/tags?query=mex&household_id=HOUSEHOLD_ID" -b cookies.txt

# Filter by kind
curl "http://localhost:3000/api/tags?query=mex&kinds=CUISINE,DIET&household_id=HOUSEHOLD_ID" \
  -b cookies.txt
```

### Create Tag
```bash
curl -X POST http://localhost:3000/api/tags \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "label": "Mexican",
    "kind": "CUISINE",
    "scope": "GLOBAL"
  }'
```

### Tag a Recipe
```bash
curl -X POST http://localhost:3000/api/recipes/RECIPE_ID/tags \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"tag_id": "TAG_ID"}'
```

### Untag a Recipe
```bash
curl -X DELETE http://localhost:3000/api/recipes/RECIPE_ID/tags/TAG_ID -b cookies.txt
```

## Household Endpoints

### Get My Households
```bash
curl http://localhost:3000/api/households/me -b cookies.txt
```

### Create Invite Link
```bash
curl -X POST http://localhost:3000/api/households/invite \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"household_id": "HOUSEHOLD_ID"}'
```

### Join Household
```bash
curl -X POST http://localhost:3000/api/households/join \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"invite_code": "INVITE_CODE"}'
```

## Profile Endpoints

### Get Profile
```bash
curl http://localhost:3000/api/profile -b cookies.txt
```

### Update Profile
```bash
curl -X PATCH http://localhost:3000/api/profile \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "display_name": "New Name",
    "avatar_url": "https://example.com/avatar.jpg"
  }'
```

### Change Password
```bash
curl -X POST http://localhost:3000/api/profile/password \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "current_password": "password123",
    "new_password": "newpassword123"
  }'
```

## Testing Tips

### Save Session Cookie
```bash
# Save cookie to file
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@juicefuel.local","password":"password123"}' \
  -c cookies.txt

# Reuse cookie in subsequent requests
curl http://localhost:3000/api/recipes -b cookies.txt
```

### Pretty Print JSON
```bash
curl http://localhost:3000/api/recipes -b cookies.txt | jq
```

### Check HTTP Status
```bash
curl -i http://localhost:3000/api/recipes -b cookies.txt
```

### Test Error Handling
```bash
# Missing required field
curl -X POST http://localhost:3000/api/recipes \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"title": ""}' # Should return 400

# Unauthorized
curl http://localhost:3000/api/recipes # Should return 401

# Not found
curl http://localhost:3000/api/recipes/00000000-0000-0000-0000-000000000000 \
  -b cookies.txt # Should return 404
```

## Automated Testing

### Vitest
```bash
# Run all tests
npm test -- --run

# Run tests in watch mode
npm test

# Run specific test file
npm test -- --run server/services/shoppingListService.test.ts
```

## Related Documentation

- [[development-setup]] - Setting up development environment
- [[seeding-test-data]] - Creating test data
- [[../architecture/layered-architecture]] - Understanding API structure
