import prisma from '../../utils/prisma';
import { requireAuth } from '../../utils/authHelpers';

export default defineEventHandler(async (event) => {
  const userId = await requireAuth(event);

  // Get user's active household
  const user = await prisma.user_profile.findUnique({
    where: { id: userId },
    select: { active_household_id: true },
  });

  if (!user?.active_household_id) {
    throw createError({
      statusCode: 404,
      message: 'No active household',
    });
  }

  // Get libraries from user's household and public libraries
  const libraries = await prisma.recipe_library.findMany({
    where: {
      OR: [
        { household_id: user.active_household_id },
        { is_public: true },
      ],
    },
    include: {
      _count: {
        select: {
          recipes: true,
        },
      },
      created_by: {
        select: {
          id: true,
          display_name: true,
        },
      },
    },
    orderBy: [
      { created_at: 'desc' },
    ],
  });

  return libraries.map(lib => ({
    id: lib.id,
    name: lib.name,
    household_id: lib.household_id,
    is_public: lib.is_public,
    recipe_count: lib._count.recipes,
    is_own_household: lib.household_id === user.active_household_id,
    created_by: lib.created_by,
    created_at: lib.created_at,
  }));
});
