import prisma from '../../../../utils/prisma';
import { requireAuth } from '../../../../utils/authHelpers';

export default defineEventHandler(async (event) => {
  await requireAuth(event);
  const ingredientId = getRouterParam(event, 'id');
  const tagId = getRouterParam(event, 'tagId');

  if (!ingredientId || !tagId) {
    throw createError({
      statusCode: 400,
      message: 'Ingredient ID and tag ID required',
    });
  }

  await prisma.ingredient_tag.deleteMany({
    where: {
      ingredient_id: ingredientId,
      tag_id: tagId,
    },
  });

  return { success: true };
});
