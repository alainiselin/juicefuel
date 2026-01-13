import { recipeService } from '../../services/recipeService';
import { requireAuth } from '../../utils/authHelpers';
import { RecipeQuerySchema } from '../../../spec/schemas';

export default defineEventHandler(async (event) => {
  const userId = await requireAuth(event);
  const query = getQuery(event);
  
  const validation = RecipeQuerySchema.safeParse(query);
  if (!validation.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid query parameters',
      data: validation.error.flatten(),
    });
  }

  const recipes = await recipeService.listRecipesForUser(
    userId,
    validation.data.query,
    validation.data.recipe_library_id
  );

  return recipes;
});
