# JuiceFuel Desktop Planner - Architecture

## Component Hierarchy

```
app.vue
└── <NuxtPage />
    │
    ├── /plan (Planner Page)
    │   └── <DesktopShell>
    │       └── Planner Content
    │           ├── Week Navigation
    │           ├── Slot Tabs
    │           └── Meal Cards Grid
    │               ├── <MealCard> (x N entries)
    │               └── <AddMealCard> (1)
    │
    └── /meal/[id] (Detail Page)
        └── <DesktopShell>
            └── <MealDetailCard>
                ├── Header (title, actions)
                ├── Instructions
                ├── Ingredients List
                └── Source URL
```

## Data Flow

```
┌──────────────────────────────────────────────────────────────┐
│                         User Action                           │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────┐
│                    Component (Vue)                            │
│  • /plan page (week/slot selection)                           │
│  • /meal/[id] page (view detail)                              │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────┐
│                  Pinia Store (State)                          │
│  • useMealPlanStore()                                         │
│  • Cached entries[]                                           │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────┐
│                   useApi() Composable                         │
│  • getMealPlan(id, from, to)                                  │
│  • deleteMealPlanEntry(id)                                    │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────┐
│                    API Endpoints                              │
│  GET    /api/meal-plan?meal_plan_id&from&to                   │
│  GET    /api/meal-plan/:id          ← NEW                     │
│  DELETE /api/meal-plan/:id                                    │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────┐
│                  Service Layer                                │
│  • mealPlanService.getEntries()                               │
│  • mealPlanService.getEntry()                                 │
│  • mealPlanService.deleteEntry()                              │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────┐
│                  Repository Layer                             │
│  • mealPlanRepo.findByDateRange()                             │
│  • mealPlanRepo.findById()                                    │
│  • mealPlanRepo.delete()                                      │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────┐
│                    Prisma Client                              │
│  • prisma.meal_slot.findMany()                                │
│  • prisma.meal_slot.findUnique()                              │
│  • includes: { recipe: { ingredients: { ingredient } } }      │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────┐
│                    PostgreSQL Database                        │
│  Tables: meal_slot, recipe, recipe_ingredient, ingredient     │
└──────────────────────────────────────────────────────────────┘
```

## State Management

### Global State (Pinia)
- **useMealPlanStore**: Manages meal entries array, loading state
- **useRecipesStore**: Recipe catalog (existing, not modified)

### Local Component State
- **plan.vue**:
  - `weekStartDate`: Current week being viewed
  - `selectedSlot`: Active tab (BREAKFAST/LUNCH/DINNER/ALL)
  - `mealPlanId`: UUID of the meal plan

- **meal/[id].vue**:
  - `entry`: Full meal entry with recipe details
  - `loading`: Fetch state
  - `error`: Error message

## Routing

```
/plan               → Desktop Planner (week view)
/meal/:id           → Meal Detail View
/recipes            → Recipe Library (existing)
/shopping-list      → Shopping List (existing)
```

## Type Safety

All components use types from `spec/schemas.ts`:

- `MealPlanEntry`: Meal slot with recipe
- `Recipe`: Recipe with ingredients
- `RecipeIngredient`: Ingredient with quantity/unit
- `SlotType`: BREAKFAST | LUNCH | DINNER | SNACK | OTHER
- `Unit`: G | KG | ML | L | TBSP | TSP | CUP | PIECE | etc.

## Key Design Decisions

1. **Desktop-First**: No mobile optimization yet (min-width: 1024px)
2. **Week-Based Navigation**: Monday-Sunday weeks, not calendar months
3. **Slot Filtering**: Client-side filtering for instant response
4. **Horizontal Cards**: Better for scanning meal options
5. **Navigation to Detail**: Click card → full page detail view
6. **No Inline Editing**: Read-only views for now
7. **Explicit Loading States**: User always knows when data is fetching
8. **Confirmation Dialogs**: Prevent accidental deletions

## Future Considerations

- Implement proper auth context for meal plan ID
- Add optimistic updates for better UX
- Consider virtualized scrolling for large meal plans
- Add keyboard shortcuts (arrow keys, escape)
- Implement undo/redo for destructive actions
- Add meal plan templates/presets
