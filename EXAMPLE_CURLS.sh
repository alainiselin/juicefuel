#!/bin/bash
# JuiceFuel API Examples
# Make sure the dev server is running: npm run dev

# Color output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test UUIDs (replace with your actual UUIDs after seeding database)
RECIPE_LIBRARY_ID="22222222-2222-2222-2222-222222222222"
MEAL_PLAN_ID="33333333-3333-3333-3333-333333333333"
INGREDIENT_FLOUR="44444444-4444-4444-4444-444444444444"
INGREDIENT_SUGAR="55555555-5555-5555-5555-555555555555"
INGREDIENT_EGGS="66666666-6666-6666-6666-666666666666"

BASE_URL="http://localhost:3000"

echo -e "${BLUE}=== JuiceFuel API Examples ===${NC}\n"

# ============================================================================
echo -e "${GREEN}1. List Recipes${NC}"
curl -s "${BASE_URL}/api/recipes" | jq '.' || curl "${BASE_URL}/api/recipes"
echo -e "\n"

# ============================================================================
echo -e "${GREEN}2. Create Recipe${NC}"
RECIPE_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/recipes" \
  -H "Content-Type: application/json" \
  -d "{
    \"recipe_library_id\": \"${RECIPE_LIBRARY_ID}\",
    \"title\": \"Simple Pancakes\",
    \"source_url\": \"https://example.com/pancakes\",
    \"instructions_markdown\": \"1. Mix dry ingredients\\n2. Add wet ingredients\\n3. Cook on griddle\",
    \"ingredients\": [
      {
        \"ingredient_id\": \"${INGREDIENT_FLOUR}\",
        \"quantity\": 200,
        \"unit\": \"G\",
        \"note\": \"all-purpose\"
      },
      {
        \"ingredient_id\": \"${INGREDIENT_SUGAR}\",
        \"quantity\": 50,
        \"unit\": \"G\"
      },
      {
        \"ingredient_id\": \"${INGREDIENT_EGGS}\",
        \"quantity\": 2,
        \"unit\": \"PIECE\"
      }
    ]
  }")

echo "$RECIPE_RESPONSE" | jq '.' || echo "$RECIPE_RESPONSE"
RECIPE_ID=$(echo "$RECIPE_RESPONSE" | jq -r '.id' 2>/dev/null || echo "")
echo -e "\n"

# ============================================================================
echo -e "${GREEN}3. Get Recipe by ID${NC}"
if [ -n "$RECIPE_ID" ] && [ "$RECIPE_ID" != "null" ]; then
  curl -s "${BASE_URL}/api/recipes/${RECIPE_ID}" | jq '.' || curl "${BASE_URL}/api/recipes/${RECIPE_ID}"
else
  echo "No recipe ID available (create a recipe first)"
fi
echo -e "\n"

# ============================================================================
echo -e "${GREEN}4. Search Recipes${NC}"
curl -s "${BASE_URL}/api/recipes?query=pancake" | jq '.' || curl "${BASE_URL}/api/recipes?query=pancake"
echo -e "\n"

# ============================================================================
echo -e "${GREEN}5. Update Recipe${NC}"
if [ -n "$RECIPE_ID" ] && [ "$RECIPE_ID" != "null" ]; then
  curl -s -X PATCH "${BASE_URL}/api/recipes/${RECIPE_ID}" \
    -H "Content-Type: application/json" \
    -d '{
      "title": "Delicious Pancakes",
      "instructions_markdown": "1. Mix dry ingredients\n2. Add wet ingredients\n3. Cook on medium heat\n4. Serve with syrup"
    }' | jq '.' || curl -X PATCH "${BASE_URL}/api/recipes/${RECIPE_ID}" \
    -H "Content-Type: application/json" \
    -d '{"title": "Delicious Pancakes"}'
else
  echo "No recipe ID available"
fi
echo -e "\n"

# ============================================================================
echo -e "${GREEN}6. Create Meal Plan Entry${NC}"
ENTRY_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/meal-plan" \
  -H "Content-Type: application/json" \
  -d "{
    \"meal_plan_id\": \"${MEAL_PLAN_ID}\",
    \"date\": \"2025-01-15\",
    \"slot\": \"BREAKFAST\",
    \"recipe_id\": \"${RECIPE_ID}\"
  }")

echo "$ENTRY_RESPONSE" | jq '.' || echo "$ENTRY_RESPONSE"
ENTRY_ID=$(echo "$ENTRY_RESPONSE" | jq -r '.id' 2>/dev/null || echo "")
echo -e "\n"

# ============================================================================
echo -e "${GREEN}7. Get Meal Plan Entries${NC}"
curl -s "${BASE_URL}/api/meal-plan?meal_plan_id=${MEAL_PLAN_ID}&from=2025-01-01&to=2025-01-31" | jq '.' || \
  curl "${BASE_URL}/api/meal-plan?meal_plan_id=${MEAL_PLAN_ID}&from=2025-01-01&to=2025-01-31"
echo -e "\n"

# ============================================================================
echo -e "${GREEN}8. Generate Shopping List${NC}"
curl -s "${BASE_URL}/api/shopping-list?meal_plan_id=${MEAL_PLAN_ID}&from=2025-01-01&to=2025-01-31" | jq '.' || \
  curl "${BASE_URL}/api/shopping-list?meal_plan_id=${MEAL_PLAN_ID}&from=2025-01-01&to=2025-01-31"
echo -e "\n"

# ============================================================================
echo -e "${GREEN}9. Delete Meal Plan Entry${NC}"
if [ -n "$ENTRY_ID" ] && [ "$ENTRY_ID" != "null" ]; then
  curl -s -X DELETE "${BASE_URL}/api/meal-plan/${ENTRY_ID}"
  echo "Deleted entry ${ENTRY_ID}"
else
  echo "No entry ID available"
fi
echo -e "\n"

# ============================================================================
echo -e "${GREEN}10. Delete Recipe${NC}"
if [ -n "$RECIPE_ID" ] && [ "$RECIPE_ID" != "null" ]; then
  curl -s -X DELETE "${BASE_URL}/api/recipes/${RECIPE_ID}"
  echo "Deleted recipe ${RECIPE_ID}"
else
  echo "No recipe ID available"
fi
echo -e "\n"

echo -e "${BLUE}=== Examples Complete ===${NC}"
echo "Note: Replace the UUIDs at the top of this script with your actual IDs from the database"
