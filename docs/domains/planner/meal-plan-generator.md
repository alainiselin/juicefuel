# Meal Plan Generator - Implementation Summary

## Overview
Successfully implemented a pseudo-randomized meal plan suggestion feature for the JuiceFuel app. The feature allows users to generate meal plans based on preferences, dietary restrictions, and variety constraints.

## Components Delivered

### 1. Core Generator Service
**File:** `server/services/mealPlanGenerator.ts`
- Weighted selection algorithm with configurable parameters
- Eligibility filtering (diet, protein, effort)
- Progressive constraint relaxation ladder
- Deterministic seeded random for reproducible results
- Variety controls (cuisine, protein, recipe repeats)

### 2. API Endpoints

#### POST /api/meal-plan/generate
**File:** `server/api/meal-plan/generate.post.ts`
- Fetches user's recipes with tags and favorites
- Calculates recent usage from last 14 days
- Generates meal plan suggestion
- Returns slots and any relaxed constraints

#### POST /api/meal-plan/apply
**File:** `server/api/meal-plan/apply.post.ts`
- Applies generated suggestion to meal planner
- Only fills empty slots (preserves existing entries)
- Returns applied/skipped counts

### 3. UI Components

#### MealPlanGeneratorModal
**File:** `app/components/MealPlanGeneratorModal.vue`
- Bottom sheet/modal with generation parameters
- Simple mode: Days, Meal Types, Diet, Favorites Mix
- Advanced mode: Protein filters, Effort, Variety options
- Preview with relaxed constraints chips
- Reroll and Apply actions

#### Plan Page Integration
**File:** `app/pages/plan.vue`
- Added "Generate Meal Plan" button below meal grid
- Integrated generator modal component

### 4. Testing
**File:** `spec/mealPlanGenerator.test.ts`
- 9 comprehensive test cases
- All tests passing ✅
- Covers: basic generation, diet filters, protein filters, effort filters, constraint relaxation, edge cases

### 5. Documentation
**File:** `docs/MEAL_PLAN_GENERATOR.md`
- Complete feature documentation
- Algorithm explanation
- API reference
- Tag structure requirements
- Future enhancement ideas

## Features Implemented

### Parameters
- **Days:** 1-14 days of meal planning
- **Meal Types:** Breakfast, Lunch, Dinner (at least 1 required)
- **Diet:** None, Vegetarian, Vegan
- **Favorites Mix:** 0-100% ratio of favorite recipes
- **Protein Filters:** Poultry, Beef, Fish, Pork, Game
- **Effort:** Any, Quick (≤20min), Normal (21-45min), Project (≥46min)
- **Variety Controls:**
  - Avoid repeating same recipe
  - Avoid back-to-back cuisine repeats
  - Avoid back-to-back protein repeats

### Weighting System
- Base weight: 1.0
- Favorited recipes: ×3.0
- Used in last 3 days: ×0.15
- Used in last 14 days: ×0.3
- Back-to-back cuisine match: ×0.6
- Back-to-back protein match: ×0.7

### Constraint Relaxation Ladder
Progressive relaxation when constraints cannot be met:
1. Relax effort filter
2. Relax protein filters
3. Allow recipe repeats
4. If still insufficient: show error

User is notified of any relaxed constraints via UI chips.

## Technical Decisions

1. **Household-scoped**: Uses active household's recipe library
2. **Empty slot filling**: Only fills empty meal slots, preserves existing entries
3. **Deterministic reroll**: Seed-based randomization enables consistent rerolls
4. **Tag-based filtering**: Relies on structured tags (diet:*, protein:*, cuisine:*, time:*, technique:*)
5. **Recent usage tracking**: Uses last 14 days of meal plan entries for weighting

## Tag Structure Requirements

For full functionality, recipes should have tags in these formats:
- **Diet:** `diet:vegan`, `diet:vegetarian`
- **Protein:** `protein:poultry`, `protein:beef`, `protein:fish`, `protein:pork`, `protein:game`
- **Cuisine:** `cuisine:asian`, `cuisine:mexican`, `cuisine:italian`, etc.
- **Time:** `time:quick`, `time:weekend`
- **Technique:** `technique:slow-cooked`

## Testing Results

```
✓ spec/mealPlanGenerator.test.ts (9 tests) 9ms
  ✓ MealPlanGenerator (9)
    ✓ should generate a basic meal plan
    ✓ should respect vegetarian diet filter
    ✓ should respect vegan diet filter
    ✓ should apply protein filter
    ✓ should respect quick effort filter
    ✓ should relax constraints when necessary
    ✓ should throw error if no recipes available
    ✓ should generate consistent results with same seed
    ✓ should favor favorites when ratio is high

Test Files  1 passed (1)
     Tests  9 passed (9)
```

## User Flow

1. User navigates to `/plan` (Meal Planner)
2. Clicks "Generate Meal Plan" button below grid
3. Modal opens with default settings
4. User adjusts parameters (days, meal types, diet, etc.)
5. Optionally expands "More Filters" for advanced controls
6. Clicks "Roll the Dice" to generate
7. System shows preview with any relaxed constraints
8. User can "Reroll" (same settings, new randomization) or "Apply to Planner"
9. On apply, empty slots are filled with generated suggestions
10. Modal closes and planner refreshes

## Files Created/Modified

### Created:
- `server/services/mealPlanGenerator.ts`
- `server/api/meal-plan/generate.post.ts`
- `server/api/meal-plan/apply.post.ts`
- `app/components/MealPlanGeneratorModal.vue`
- `spec/mealPlanGenerator.test.ts`
- `docs/MEAL_PLAN_GENERATOR.md`

### Modified:
- `app/pages/plan.vue` (added button and modal integration)

## Future Enhancements

1. **Smart scheduling**: Consider prep time distribution across the week
2. **Ingredient overlap**: Minimize shopping list by reusing ingredients
3. **Seasonal awareness**: Favor recipes with seasonal ingredients
4. **User feedback loop**: Learn from deleted/modified suggestions
5. **Household preferences**: Consider multiple member preferences
6. **Batch cooking support**: Suggest recipes that work well for meal prep
7. **Nutritional balance**: Factor in nutritional goals (if added to recipes)
8. **Time-of-day optimization**: Match effort to user's typical schedule

## Notes

- Generator is deterministic with same seed (enables true reroll)
- Works gracefully with small recipe libraries via relaxation
- Mobile-responsive UI matches existing design language
- No migration required (uses existing schema + prep_time_minutes already added)
- Performance is good even with large recipe libraries (algorithm is O(n))

## Status: ✅ Complete & Tested

The meal plan generator feature is fully implemented, tested, and ready for use. All acceptance criteria from the original spec have been met.
