import { recipeService } from '../../services/recipeService';

export default defineEventHandler(async (event) => {
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

  return recipe;
});
