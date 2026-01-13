import { recipeService } from '../../services/recipeService';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');
  
  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'Recipe ID required',
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
