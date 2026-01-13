import prisma from '../../utils/prisma';
import { requireAuth } from '../../utils/authHelpers';

export default defineEventHandler(async (event) => {
  const userId = await requireAuth(event);

  const body = await readBody(event);
  const { recipe_id } = body;

  if (!recipe_id) {
    throw createError({ statusCode: 400, message: 'recipe_id is required' });
  }

  await prisma.recipe_favorite.deleteMany({
    where: {
      user_id: userId,
      recipe_id,
    },
  });

  return { success: true };
});
