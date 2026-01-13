#!/bin/bash
# Tagging System Examples
# Replace TOKEN and IDs with actual values

BASE_URL="http://localhost:3000"
SESSION="session_token=YOUR_TOKEN_HERE"
HH_ID="YOUR_HOUSEHOLD_ID"

echo "=== 1. Search for tags ==="
curl -H "Cookie: $SESSION" \
  "$BASE_URL/api/tags?query=mex&kinds=CUISINE&household_id=$HH_ID&limit=10"

echo -e "\n\n=== 2. Create a GLOBAL tag ==="
curl -X POST "$BASE_URL/api/tags" \
  -H "Cookie: $SESSION" \
  -H "Content-Type: application/json" \
  -d '{
    "label": "Mexican",
    "kind": "CUISINE",
    "scope": "GLOBAL"
  }'

echo -e "\n\n=== 3. Create a HOUSEHOLD tag ==="
curl -X POST "$BASE_URL/api/tags" \
  -H "Cookie: $SESSION" \
  -H "Content-Type: application/json" \
  -d "{
    \"label\": \"Weeknight Favorite\",
    \"kind\": \"TIME\",
    \"scope\": \"HOUSEHOLD\",
    \"household_id\": \"$HH_ID\"
  }"

echo -e "\n\n=== 4. Attach tag to recipe ==="
RECIPE_ID="YOUR_RECIPE_ID"
TAG_ID="YOUR_TAG_ID"

curl -X POST "$BASE_URL/api/recipes/$RECIPE_ID/tags" \
  -H "Cookie: $SESSION" \
  -H "Content-Type: application/json" \
  -d "{\"tag_id\": \"$TAG_ID\"}"

echo -e "\n\n=== 5. Get recipe with tags ==="
curl -H "Cookie: $SESSION" \
  "$BASE_URL/api/recipes/$RECIPE_ID"

echo -e "\n\n=== 6. Detach tag from recipe ==="
curl -X DELETE "$BASE_URL/api/recipes/$RECIPE_ID/tags/$TAG_ID" \
  -H "Cookie: $SESSION"

echo -e "\n\n=== 7. Tag an ingredient ==="
INGREDIENT_ID="YOUR_INGREDIENT_ID"

curl -X POST "$BASE_URL/api/ingredients/$INGREDIENT_ID/tags" \
  -H "Cookie: $SESSION" \
  -H "Content-Type: application/json" \
  -d "{\"tag_id\": \"$TAG_ID\"}"

echo -e "\n\n=== 8. Tag a shopping list item ==="
ITEM_ID="YOUR_ITEM_ID"

curl -X POST "$BASE_URL/api/shopping-list-items/$ITEM_ID/tags" \
  -H "Cookie: $SESSION" \
  -H "Content-Type: application/json" \
  -d "{\"tag_id\": \"$TAG_ID\"}"

echo -e "\n\n=== 9. Search multiple tag kinds ==="
curl -H "Cookie: $SESSION" \
  "$BASE_URL/api/tags?kinds=CUISINE,DIET,ALLERGEN&household_id=$HH_ID&limit=20"

echo -e "\n\n=== 10. Create common tags ==="
for tag in "Vegan:DIET" "Gluten-Free:ALLERGEN" "Quick:TIME" "Produce:CATEGORY" "Dairy:CATEGORY"; do
  label=$(echo $tag | cut -d: -f1)
  kind=$(echo $tag | cut -d: -f2)
  curl -X POST "$BASE_URL/api/tags" \
    -H "Cookie: $SESSION" \
    -H "Content-Type: application/json" \
    -d "{\"label\": \"$label\", \"kind\": \"$kind\", \"scope\": \"GLOBAL\"}"
  echo ""
done

echo -e "\n\nDone!"
