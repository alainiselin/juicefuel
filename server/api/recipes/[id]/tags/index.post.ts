import prisma from '../../../../utils/prisma';
import { requireAuth } from '../../../../utils/authHelpers';
import { z } from 'zod';

const AttachTagSchema = z.object({
  tag_id: z.string().uuid(),
});

export default defineEventHandler(async (event) => {
  const userId = await requireAuth(event);
  const recipeId = getRouterParam(event, 'id');
  const body = await readBody(event);

  if (!recipeId) {
    throw createError({
      statusCode: 400,
      message: 'Recipe ID required',
    });
  }

  const validation = AttachTagSchema.safeParse(body);
  if (!validation.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid request',
      data: validation.error.flatten(),
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

  await prisma.recipe_tag.upsert({
    where: {
      recipe_id_tag_id: {
        recipe_id: recipeId,
        tag_id: validation.data.tag_id,
      },
    },
    update: {},
    create: {
      recipe_id: recipeId,
      tag_id: validation.data.tag_id,
    },
  });

  return { success: true };
});
