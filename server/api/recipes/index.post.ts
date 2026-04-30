import { recipeService } from '../../services/recipeService';
import { requireAuth } from '../../utils/authHelpers';
import { CreateRecipeSchema } from '../../../spec/schemas';

export default defineEventHandler(async (event) => {
  const userId = await requireAuth(event);
  const body = await readBody(event);
  
  const validation = CreateRecipeSchema.safeParse(body);
  if (!validation.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid recipe data',
      data: validation.error.flatten(),
    });
  }

  const writableLibraryIds = await recipeService.getUserRecipeLibraryIds(userId);
  if (!writableLibraryIds.includes(validation.data.recipe_library_id)) {
    throw createError({
      statusCode: 404,
      message: 'Recipe library not found',
    });
  }

  const recipe = await recipeService.createRecipe(validation.data);

  setResponseStatus(event, 201);
  return recipe;
});
