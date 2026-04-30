import { recipeService } from '../../services/recipeService';
import { requireAuth } from '../../utils/authHelpers';
import { UpdateRecipeSchema } from '../../../spec/schemas';

export default defineEventHandler(async (event) => {
  const userId = await requireAuth(event);
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

  const recipe = await recipeService.updateRecipe(id, validation.data);
  
  if (!recipe) {
    throw createError({
      statusCode: 404,
      message: 'Recipe not found',
    });
  }

  return recipe;
});
