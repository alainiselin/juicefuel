import prisma from '../../utils/prisma';
import { requireAuth } from '../../utils/authHelpers';
import { z } from 'zod';

const UpdateLibrarySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  is_public: z.boolean().optional(),
});

export default defineEventHandler(async (event) => {
  const userId = await requireAuth(event);
  const libraryId = getRouterParam(event, 'id');
  const body = await readBody(event);

  if (!libraryId) {
    throw createError({
      statusCode: 400,
      message: 'Library ID required',
    });
  }

  const validation = UpdateLibrarySchema.safeParse(body);
  if (!validation.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid library data',
      data: validation.error.flatten(),
    });
  }

  // Check if user has permission to update library
  const library = await prisma.recipe_library.findUnique({
    where: { id: libraryId },
    include: {
      household: {
        include: {
          members: {
            where: { user_id: userId },
          },
        },
      },
    },
  });

  if (!library) {
    throw createError({
      statusCode: 404,
      message: 'Library not found',
    });
  }

  if (library.household.members.length === 0) {
    throw createError({
      statusCode: 403,
      message: 'You do not have permission to update this library',
    });
  }

  // Update library
  const updated = await prisma.recipe_library.update({
    where: { id: libraryId },
    data: validation.data,
    include: {
      _count: {
        select: {
          recipes: true,
        },
      },
    },
  });

  return {
    id: updated.id,
    name: updated.name,
    is_public: updated.is_public,
    recipe_count: updated._count.recipes,
    updated_at: updated.updated_at,
  };
});
