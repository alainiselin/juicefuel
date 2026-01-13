import prisma from '../../../../utils/prisma';
import { requireAuth } from '../../../../utils/authHelpers';

export default defineEventHandler(async (event) => {
  const userId = await requireAuth(event);
  const recipeId = getRouterParam(event, 'id');
  const tagId = getRouterParam(event, 'tagId');

  if (!recipeId || !tagId) {
    throw createError({
      statusCode: 400,
      message: 'Recipe ID and tag ID required',
    });
  }

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

  await prisma.recipe_tag.deleteMany({
    where: {
      recipe_id: recipeId,
      tag_id: tagId,
    },
  });

  return { success: true };
});
