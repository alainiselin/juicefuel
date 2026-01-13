import { recipeService } from '../../services/recipeService';
import { UpdateRecipeSchema } from '../../../spec/schemas';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');
  
  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'Recipe ID required',
    });
  }

  const body = await readBody(event);
  
  const validation = UpdateRecipeSchema.safeParse(body);
  if (!validation.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid recipe data',
      data: validation.error.flatten(),
    });
  }

  const recipe = await recipeService.updateRecipe(id, validation.data);
  
  if (!recipe) {
    throw createError({
      statusCode: 404,
      message: 'Recipe not found',
    });
  }

  return recipe;
});
