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

  const existing = await recipeService.getRecipe(id);
  if (!existing) {
    throw createError({
      statusCode: 404,
      message: 'Recipe not found',
    });
  }

  const writableLibraryIds = await recipeService.getUserRecipeLibraryIds(userId);
  if (!writableLibraryIds.includes(existing.recipe_library_id)) {
    throw createError({
      statusCode: 404,
      message: 'Recipe not found',
    });
  }

  const deleted = await recipeService.deleteRecipe(id);
  
  if (!deleted) {
    throw createError({
      statusCode: 404,
      message: 'Recipe not found',
    });
  }

  setResponseStatus(event, 204);
  return null;
});
