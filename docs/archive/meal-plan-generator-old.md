# Meal Plan Generator Feature

## Overview
The Meal Plan Generator provides pseudo-randomized meal plan suggestions based on user preferences, dietary restrictions, and recipe library. It uses a weighted selection algorithm to balance user favorites, variety, and constraints.

## User Interface

### Entry Point
- **Dice button** appears below the meal planner grid
- Clicking opens a modal with generation parameters

### Parameters

#### Simple Mode (Default)
1. **Days** (1-14): Number of days to plan
2. **Meal Types**: Select from Breakfast, Lunch, Dinner (at least one required)
3. **Diet**: None, Vegetarian, or Vegan
4. **Favorites Mix** (0-100%): Percentage of meals to prioritize favorites

#### Advanced Mode (Expandable)
5. **Protein Filters**: Optional filters for Poultry, Beef, Fish, Pork, Game
6. **Effort**: Any, Quick (≤20 min), Normal (21-45 min), or Project (≥46 min)
7. **Variety Options**:
   - Avoid repeating the same recipe
   - Avoid repeating cuisine back-to-back
   - Avoid repeating protein back-to-back

### Workflow
1. User configures parameters
2. Clicks "Roll the Dice" to generate
3. System shows preview with any relaxed constraints
4. User can "Reroll" (same settings, new randomization) or "Apply to Planner"
5. Apply only fills empty slots (doesn't overwrite existing meals)

## Technical Implementation

### Algorithm

#### Eligibility Filtering
Recipes must match:
- **Diet**: 
  - Vegan: Must have `diet:vegan` tag
  - Vegetarian: Must have `diet:vegetarian` or `diet:vegan` tag
  - None: No diet filter
- **Protein** (if diet is none and filters selected): Must match at least one selected protein via `protein:*` tags
- **Effort** (based on `prep_time_minutes` or tags):
  - Quick: ≤20 min or `time:quick` tag
  - Normal: 21-45 min or default
  - Project: ≥46 min or `time:weekend` / `technique:slow-cooked` tags
  - Any: No filter

#### Weighting System
Base weight: 1.0

Multipliers:
- **Favorited**: ×3.0
- **Used in last 3 days**: ×0.15
- **Used in last 14 days**: ×0.3
- **Back-to-back same cuisine** (if enabled): ×0.6
- **Back-to-back same protein** (if enabled): ×0.7

Selection uses weighted random sampling without replacement (when possible).

#### Favorites Ratio
- Calculate `favSlots = round(totalSlots * favoriteRatio/100)`
- Fill first `favSlots` from favorites pool
- Fill remaining from non-favorites pool
- Spill over if either pool insufficient

#### Relaxation Ladder
If unable to fill all slots with strict constraints:

1. **Relax Effort**: Set to "Any"
2. **Relax Protein**: Ignore protein filters
3. **Allow Repeats**: Disable "avoid same recipe" constraint
4. If still insufficient: Show error

Relaxed constraints are displayed to user as chips in the UI.

### API Endpoints

#### POST /api/meal-plan/generate
Generates meal plan suggestion.

**Request:**
```json
{
  "days": 7,
  "mealTypes": ["BREAKFAST", "LUNCH", "DINNER"],
  "diet": "none",
  "favoriteRatio": 30,
  "proteinFilters": [],
  "effort": "any",
  "avoidSameRecipe": true,
  "avoidBackToBackCuisine": false,
  "avoidBackToBackProtein": false,
  "seed": 1234567890
}
```

**Response:**
```json
{
  "suggestion": [
    {
      "date": "2026-01-04",
      "mealType": "BREAKFAST",
      "recipeId": "uuid-123"
    }
  ],
  "relaxedConstraints": ["effort", "protein"]
}
```

#### POST /api/meal-plan/apply
Applies generated suggestion to meal planner.

**Request:**
```json
{
  "mealPlanId": "uuid-456",
  "slots": [
    {
      "date": "2026-01-04",
      "mealType": "BREAKFAST",
      "recipeId": "uuid-123"
    }
  ]
}
```

**Response:**
```json
{
  "applied": 15,
  "skipped": 6,
  "entries": []
}
```

### Data Model

#### Recipe Candidate
```typescript
interface RecipeCandidate {
  id: string;
  title: string;
  prepTimeMinutes?: number | null;
  tags: string[]; // tag slugs
  isFavorite: boolean;
  lastUsedDays?: number; // days since last use, undefined if never
}
```

#### Generated Slot
```typescript
interface GeneratedSlot {
  date: string; // ISO date
  mealType: SlotType;
  recipeId: string;
}
```

### Tag Structure
The system relies on structured tags:

- **Diet**: `diet:vegan`, `diet:vegetarian`
- **Protein**: `protein:poultry`, `protein:beef`, `protein:fish`, `protein:pork`, `protein:game`
- **Cuisine**: `cuisine:asian`, `cuisine:mexican`, `cuisine:italian`, etc.
- **Time**: `time:quick`, `time:weekend`
- **Technique**: `technique:slow-cooked`

## Testing

Tests cover:
- Basic generation with various parameters
- Diet filters (vegetarian, vegan)
- Protein filters
- Effort filters
- Constraint relaxation ladder
- Deterministic reroll (same seed = same result)
- Favorites ratio
- Edge cases (tiny library, no matches)

Run tests:
```bash
npm run test -- spec/mealPlanGenerator.test.ts
```

## Future Enhancements

1. **Smart scheduling**: Consider prep time distribution across the week
2. **Ingredient overlap**: Minimize shopping list by reusing ingredients
3. **Seasonal awareness**: Favor recipes with seasonal ingredients
4. **User feedback**: Learn from deleted/modified suggestions
5. **Collaboration**: Consider household member preferences
6. **Batch cooking**: Suggest recipes that work well for meal prep

## Notes

- The generator is deterministic given the same seed, enabling reproducible "reroll" behavior
- Empty slots in the planner are preserved; only empty slots are filled
- Recent usage data comes from the last 14 days of meal plan entries
- The system gracefully handles small recipe libraries by relaxing constraints progressively
