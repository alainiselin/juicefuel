# Recipe Creation Modal: Draft Ingredients Implementation

## Overview
Implemented a friction-free recipe creation experience that allows users to add ingredients locally (staging) before the recipe exists in the database. All data is persisted in a single submit action.

## Problem Statement
The create recipe modal initially required users to:
1. Fill in basic recipe info
2. Click "Create Recipe" to get a recipe ID
3. Then add ingredients using the ID-dependent AddIngredientSearch component

This two-phase approach created friction and wasn't intuitive. Users wanted to fill out all fields including ingredients before submitting.

## Solution: Draft Ingredients Staging

### Architecture
Created a **wrapper component** pattern that reuses the exact ingredient search UI from edit mode, but stages data locally instead of making API calls:

- **DraftAddIngredientSearch**: New wrapper component that provides the same UI/UX as AddIngredientSearch but emits ingredient data to parent instead of POSTing to API
- **Draft array in parent**: `draftIngredients` ref holds all staged ingredients
- **Bulk persistence**: On final submit, loop through draft array and POST each ingredient to the newly created recipe

### Implementation Details

#### 1. Created DraftAddIngredientSearch Component
**File**: `app/components/recipe/DraftAddIngredientSearch.vue`

- Identical UI to AddIngredientSearch (ingredient search, quantity/unit/note form)
- Searches ingredients via `/api/ingredients` endpoint
- On "Add", emits `added` event with ingredient data instead of API POST
- Emits type: `{ ingredient_id, ingredient_name, quantity, unit, note }`

#### 2. Updated Create Modal UI
**File**: `app/pages/recipes/index.vue`

Replaced two-phase ingredient section with:
```vue
<DraftAddIngredientSearch @added="onDraftIngredientAdded" />

<div v-if="draftIngredients.length > 0">
  <!-- List of staged ingredients with remove buttons -->
</div>
```

**Key changes:**
- Removed conditional `v-if="createdRecipeId"` checks
- Ingredient search always visible (no "create first" message)
- Display list shows staged ingredients with formatted quantity/unit
- Each ingredient has remove button to delete from draft array
- Simplified footer buttons to single "Create Recipe" button

#### 3. Implemented Bulk Persistence
**Function**: `createRecipe()`

Enhanced recipe creation flow:
```typescript
1. POST recipe with basic fields (title, description, library_id, etc.)
2. POST all tags to /api/recipes/:id/tags
3. POST all draft ingredients to /api/recipes/:id/ingredients  // NEW
4. Navigate to recipe detail page
```

Ingredients are added via loop:
```typescript
for (const ingredient of draftIngredients.value) {
  await $fetch(`/api/recipes/${createdRecipe.id}/ingredients`, {
    method: 'POST',
    body: {
      ingredient_id: ingredient.ingredient_id,
      quantity: ingredient.quantity,
      unit: ingredient.unit,
      note: ingredient.note,
    }
  });
}
```

#### 4. Cleanup and State Management

**Added functions:**
- `onDraftIngredientAdded()`: Pushes new ingredient to draft array
- `removeDraftIngredient(index)`: Removes ingredient from draft array by index

**Updated functions:**
- `createRecipe()`: Now navigates to detail page directly after creation (no more two-phase modal)
- `closeCreateModal()`: Clears `draftIngredients` instead of `newRecipeIngredients`

**Removed:**
- `newRecipeIngredients` ref (no longer needed)
- `ensureRecipeCreated()` function (no longer needed)
- `finishCreateRecipe()` function (replaced by direct navigation)
- `onNewRecipeIngredientAdded()` function (no longer needed)
- Two-phase button system (simplified to single submit)

## User Experience

### Before
1. Open create modal
2. Enter title, description, library, tags
3. Click "Create Recipe" → recipe created in DB, modal stays open
4. Now add ingredients one by one
5. Click "Done & View Recipe" → navigate to detail page

### After
1. Open create modal
2. Enter title, description, library, tags
3. Add ingredients (staged locally, no API calls)
4. Remove/adjust ingredients as needed
5. Click "Create Recipe" → ALL data persisted, navigate to detail page

**Benefits:**
- Single submit action (less friction)
- No premature database records
- Can add/remove ingredients freely before committing
- Feels like traditional form submission
- Identical ingredient search UX to edit mode (component reuse)

## Technical Notes

### Component Reuse Philosophy
Instead of duplicating markup or modifying the shared AddIngredientSearch component, we created a thin wrapper that:
- Uses the same search endpoint and UI patterns
- Emits events instead of making persistence API calls
- Allows the parent to control when/how data is persisted

This keeps the edit mode component unchanged and maintains separation of concerns.

### Bulk vs. Batch Endpoint
Current implementation uses a loop with individual POST requests for each ingredient. This is simple and reuses existing `/api/recipes/:id/ingredients` endpoint.

**Alternative approach** (not implemented):
- Create bulk endpoint: `/api/recipes/:id/ingredients/bulk`
- Accept array of ingredients in single request
- More efficient for recipes with many ingredients
- Consider if performance becomes an issue

### State Management
The `createdRecipeId` ref is still used internally during the creation flow, but is no longer exposed to the UI. The modal no longer has a "created" vs "editing" state - it's always in "draft" mode until final submit.

## Files Modified

1. **app/components/recipe/DraftAddIngredientSearch.vue** (NEW)
   - Wrapper component for draft ingredient staging
   - 187 lines, identical UI to AddIngredientSearch

2. **app/components/recipe/DraftIngredientCard.vue** (NEW)
   - Display-only ingredient card component
   - Matches exact visual styling of IngredientCard from edit mode
   - Square aspect ratio with grid layout
   - Remove button on hover

3. **app/pages/recipes/index.vue**
   - Replaced ingredients section (lines 286-329)
   - Now uses DraftIngredientCard in grid layout (matches Edit view)
   - Grid: "grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2"
   - Updated createRecipe() to include ingredient persistence (lines 695-758)
   - Added onDraftIngredientAdded() and removeDraftIngredient() (lines 755-758)
   - Simplified modal footer buttons (lines 325-336)
   - Removed unused refs, functions, and formatters

## Testing Checklist

- [x] TypeScript compiles without errors related to changes
- [x] ESLint passes with no errors or warnings
- [x] Ingredient cards use grid layout (matches Edit view)
- [x] Ingredient cards are square with aspect-ratio styling
- [ ] Open create recipe modal
- [ ] Add multiple ingredients using search
- [ ] Verify ingredient cards display in grid (not list)
- [ ] Hover over ingredient card to see remove button
- [ ] Remove an ingredient from draft list
- [ ] Submit form and verify all ingredients persist
- [ ] Verify navigation to detail page works
- [ ] Verify edit mode still works unchanged
- [ ] Test with empty ingredients (recipe with no ingredients)
- [ ] Test with special characters in ingredient notes

## Future Enhancements

1. **Drag-and-drop reordering** of draft ingredients
2. **Bulk import** from clipboard/CSV
3. **Recipe templates** with pre-filled ingredients
4. **Duplicate detection** before adding to draft array
5. **Batch endpoint** for more efficient bulk persistence
