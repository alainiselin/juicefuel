# Test Data Seeded Successfully! 🌱

## Summary

The database has been seeded with comprehensive test data for testing the recipe library management system.

## What Was Seeded

### 👤 Users (2)
1. **Test User** - test@juicefuel.local / password123
2. **Second User** - second@juicefuel.local / password123

### 🏠 Households (2)
- **Test Household** - for Test User
- **Second Household** - for Second User

### 📚 Recipe Libraries (3)
1. **"Test User's Recipes"** (Private) - 4 recipes
2. **"Second User's Recipes"** (Private) - 3 recipes
3. **"Community Recipes (Public)"** (Public) - 2 recipes ✨

### 🍳 Recipes (9 Total)

#### Test User's Private Library
1. **Simple Pancakes** - Breakfast recipe with flour, eggs, milk
2. **Pasta Pomodoro** - Italian pasta with tomatoes
3. **Chicken Stir Fry** - Asian-style stir fry with rice
4. **Overnight Oats** - Healthy breakfast option

#### Second User's Private Library
5. **Veggie Curry** - Vegetarian curry with coconut milk
6. **Grilled Cheese Sandwich** - Classic comfort food
7. **Simple Garden Salad** - Fresh vegetable salad

#### Public Library (Accessible to All)
8. **Classic Margherita Pizza** - Traditional Italian pizza
9. **Banana Smoothie** - Healthy smoothie drink

### 📅 Meal Plans
- Both users have meal plans pre-populated for the current week
- 18 total meal slots created (10 for user 1, 8 for user 2)
- Mix of breakfast, lunch, and dinner slots

## Testing Scenarios

### Login as Test User (test@juicefuel.local)
You should see:
- ✅ Your own private library with 4 recipes
- ✅ The public "Community Recipes" library with 2 recipes
- ✅ Can create recipes in your own library
- ✅ Can browse but not edit public library recipes
- ✅ Meal planner pre-populated with current week

### Login as Second User (second@juicefuel.local)
You should see:
- ✅ Your own private library with 3 recipes
- ✅ The same public "Community Recipes" library
- ✅ Cannot see Test User's private library
- ✅ Can create recipes in your own library
- ✅ Meal planner with different meals

### Test Library Management Features

#### Create New Library
1. Go to /recipes
2. Click "Manage Libraries"
3. Create a new library (private or public)
4. Verify it appears in the dropdown

#### Toggle Public/Private
1. Open "Manage Libraries"
2. Click "Make Public" on your private library
3. Login as other user
4. Verify you can now see that library
5. Switch back and make it private again

#### Create Recipe in Library
1. Select a library from dropdown
2. Click "Create Recipe"
3. Choose library from dropdown (only shows your own)
4. Fill in recipe details
5. Verify recipe appears in that library

#### Browse Public Recipes
1. Login as either user
2. Select "Community Recipes (Public)" from dropdown
3. View the 2 public recipes
4. Try creating recipe - should only show your own libraries
5. Add public recipe to meal plan (should work)

## Database IDs for Reference

### User 1 (test@juicefuel.local)
- Household: `00000000-0000-0000-0000-000000000001`
- Meal Plan: `e7e7685f-e270-47dc-b3c5-a4237fd4791e`
- Private Library: `908b1a20-9184-4156-9934-ea1448cd819e`
- Public Library: `908b1a20-9184-4156-9934-ea1448cd8190`

### User 2 (second@juicefuel.local)
- Household: `00000000-0000-0000-0000-000000000002`
- Meal Plan: `e7e7685f-e270-47dc-b3c5-a4237fd4791f`
- Private Library: `908b1a20-9184-4156-9934-ea1448cd819f`

## Re-seeding

To reset test data:
```bash
cd /Users/alainiselin/Programming/juicefuel
export $(cat .env | grep DATABASE_URL | xargs)
npx tsx prisma/seed.ts
```

Then set active households:
```bash
docker exec supabase_db_juicefuel psql -U postgres -d postgres -c "UPDATE user_profile SET active_household_id = '00000000-0000-0000-0000-000000000001' WHERE email = 'test@juicefuel.local';"
docker exec supabase_db_juicefuel psql -U postgres -d postgres -c "UPDATE user_profile SET active_household_id = '00000000-0000-0000-0000-000000000002' WHERE email = 'second@juicefuel.local';"
```

## Visual Indicators in UI

When browsing recipes, you'll see:
- **🌐** = Public library (anyone can see)
- **📚** = Shared library (from another household)
- **(no icon)** = Your own household's private library

## Happy Testing! 🎉

The system is now fully populated with realistic test data. You can test:
- Library creation
- Public/private toggling
- Recipe creation with library selection
- Cross-user visibility
- Meal planning with recipes from different libraries
