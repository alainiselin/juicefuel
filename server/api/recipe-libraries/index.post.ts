import prisma from '../../utils/prisma';
import { requireAuth } from '../../utils/authHelpers';
import { z } from 'zod';

const CreateLibrarySchema = z.object({
  name: z.string().min(1).max(100),
  is_public: z.boolean().optional().default(false),
});

export default defineEventHandler(async (event) => {
  const userId = await requireAuth(event);
  const body = await readBody(event);

  const validation = CreateLibrarySchema.safeParse(body);
  if (!validation.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid library data',
      data: validation.error.flatten(),
    });
  }

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

  // Create library
  const library = await prisma.recipe_library.create({
    data: {
      name: validation.data.name,
      is_public: validation.data.is_public,
      household_id: user.active_household_id,
      created_by_user_id: userId,
    },
    include: {
      _count: {
        select: {
          recipes: true,
        },
      },
    },
  });

  return {
    id: library.id,
    name: library.name,
    is_public: library.is_public,
    recipe_count: library._count.recipes,
    is_own_household: true,
    created_at: library.created_at,
  };
});
