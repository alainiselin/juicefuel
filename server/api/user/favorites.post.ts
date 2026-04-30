import prisma from '../../utils/prisma';
import { requireAuth } from '../../utils/authHelpers';
import { recipeService } from '../../services/recipeService';

export default defineEventHandler(async (event) => {
  const userId = await requireAuth(event);

  const body = await readBody(event);
  const { recipe_id } = body;

  if (!recipe_id) {
    throw createError({ statusCode: 400, message: 'recipe_id is required' });
  }

  const recipe = await recipeService.getRecipe(recipe_id);
  const accessibleLibraryIds = await recipeService.getUserAccessibleLibraryIds(userId);
  if (!recipe || !accessibleLibraryIds.includes(recipe.recipe_library_id)) {
    throw createError({ statusCode: 404, message: 'Recipe not found' });
  }

  try {
    // Check if already favorited
    const existing = await prisma.recipe_favorite.findUnique({
      where: {
        user_id_recipe_id: {
          user_id: userId,
          recipe_id,
        },
      },
    });

    if (existing) {
      return existing;
    }

    const favorite = await prisma.recipe_favorite.create({
      data: {
        user_id: userId,
        recipe_id,
      },
    });

    return favorite;
  } catch (error) {
    console.error('Error creating favorite:', error);
    throw createError({
      statusCode: 500,
      message: 'Failed to create favorite',
    });
  }
});
