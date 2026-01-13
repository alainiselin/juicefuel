import prisma from '../../../../utils/prisma';
import { requireAuth } from '../../../../utils/authHelpers';

export default defineEventHandler(async (event) => {
  const userId = await requireAuth(event);
  const recipeId = getRouterParam(event, 'id');
  const recipeIngredientId = getRouterParam(event, 'recipeIngredientId');

  if (!recipeId || !recipeIngredientId) {
    throw createError({
      statusCode: 400,
      message: 'Recipe ID and ingredient ID required',
    });
  }

  const [recipe_id, ingredient_id] = recipeIngredientId.split('-').reduce((acc, part, idx) => {
    if (idx < 5) acc[0] += (idx > 0 ? '-' : '') + part;
    else acc[1] += (idx > 5 ? '-' : '') + part;
    return acc;
  }, ['', '']);

  const recipe = await prisma.recipe.findUnique({
    where: { id: recipeId },
    include: {
      recipe_library: {
        include: {
          household: {
            include: {
              members: {
                where: { user_id: userId },
              },
            },
          },
        },
      },
    },
  });

  if (!recipe || recipe.recipe_library.household.members.length === 0) {
    throw createError({
      statusCode: 404,
      message: 'Recipe not found',
    });
  }

  await prisma.recipe_ingredient.delete({
    where: {
      recipe_id_ingredient_id: {
        recipe_id,
        ingredient_id,
      },
    },
  });

  return { success: true };
});
