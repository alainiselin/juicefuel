import prisma from '../../utils/prisma';
import { requireAuth } from '../../utils/authHelpers';

export default defineEventHandler(async (event) => {
  const userId = await requireAuth(event);

  try {
    const favorites = await prisma.recipe_favorite.findMany({
      where: { user_id: userId },
      select: {
        id: true,
        recipe_id: true,
        created_at: true,
      },
      orderBy: { created_at: 'desc' },
    });

    return favorites;
  } catch (error) {
    console.error('Error fetching favorites:', error);
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch favorites',
    });
  }
});
