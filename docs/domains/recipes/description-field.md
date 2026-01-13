# Recipe Description Field Implementation

## Summary
Added a `description` field to recipes - a concise summary (max 240 characters) shown under the recipe title throughout the app.

## Changes Made

### Database & Schema
- ✅ Added `description` column to `recipe` table (`VARCHAR(240)`, nullable)
- ✅ Updated Prisma schema with description field
- ✅ Applied schema changes with `prisma db push`
- ✅ Generated Prisma client

### Backend APIs
- ✅ Updated `CreateRecipeSchema` and `UpdateRecipeSchema` in `spec/schemas.ts`
  - Added `description` field with max 240 character validation
  - Made optional for both create and update
- ✅ Updated `recipeService.ts`
  - Normalizes description (trims, replaces newlines with spaces, truncates to 240)
  - Handles description in create and update operations
- ✅ Updated `recipeRepo.ts` type signatures
  - Added description to create and update interfaces
- ✅ Updated AI recipe generation (`aiRecipeGenerator.ts`)
  - Updated schema to validate max 240 characters
  - Updated AI prompt to generate concise descriptions separately from instructions
  - Emphasized that description should NOT be in instructions
- ✅ Updated AI recipe save endpoint (`recipes/generate/save.post.ts`)
  - Saves description to separate field, not in instructions_markdown
  - Normalizes description before saving

### Frontend UI
- ✅ Recipe detail page (`recipes/[id].vue`)
  - Shows description under title if present
  - Fixed quantity display to handle Prisma Decimal types
- ✅ Meal planner detail (`components/meal/MealDetailCard.vue`)
  - Shows description under title if present
- ✅ Recipe create form (`recipes/index.vue`)
  - Added description textarea with character counter (0/240)
  - Added maxlength validation
  - Includes newRecipe.description in form state
- ✅ Recipe edit form (`recipes/edit-[id].vue`)
  - Added description textarea with character counter
  - Auto-saves on input with debounce

### Data Flow
1. **AI Generation**: AI generates description (max 240 chars) as separate field in JSON
2. **Save**: Backend normalizes (trim, replace newlines, truncate) and saves to `recipe.description`
3. **Display**: UI shows description between title and metadata on detail pages
4. **Create/Edit**: Forms include description input with validation and character counter

## Validation Strategy
- **Max length**: 240 characters enforced at:
  - Zod schema level (both AI draft and API schemas)
  - HTML maxlength attribute in forms
  - Backend normalization (slice to 240)
- **Normalization**: Trim whitespace, replace newlines with spaces
- **Approach**: Truncate at 240 (not reject), applied consistently

## Testing Recommendations
1. Generate new recipe with AI - verify description appears separately from instructions
2. Create recipe manually with description
3. Edit existing recipe to add/modify description
4. Verify character counter works in create/edit forms
5. Verify description displays on recipe detail page
6. Verify description displays in meal planner view
7. Test with 240+ character input (should truncate)
8. Test with newlines in description (should convert to spaces)
