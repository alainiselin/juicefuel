import { recipeService } from '../../services/recipeService';
import { requireAuth } from '../../utils/authHelpers';

export default defineEventHandler(async (event) => {
  const userId = await requireAuth(event);
  const id = getRouterParam(event, 'id');
  
  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'Recipe ID required',
    });
  }

  const recipe = await recipeService.getRecipe(id);
  
  if (!recipe) {
    throw createError({
      statusCode: 404,
      message: 'Recipe not found',
    });
  }

  const accessibleLibraryIds = await recipeService.getUserAccessibleLibraryIds(userId);
  if (!accessibleLibraryIds.includes(recipe.recipe_library_id)) {
    throw createError({
      statusCode: 404,
      message: 'Recipe not found',
    });
  }

  return recipe;
});
