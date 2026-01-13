import prisma from '../../../../utils/prisma';
import { requireAuth } from '../../../../utils/authHelpers';
import { z } from 'zod';

const AttachTagSchema = z.object({
  tag_id: z.string().uuid(),
});

export default defineEventHandler(async (event) => {
  await requireAuth(event);
  const ingredientId = getRouterParam(event, 'id');
  const body = await readBody(event);

  if (!ingredientId) {
    throw createError({
      statusCode: 400,
      message: 'Ingredient ID required',
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

  await prisma.ingredient_tag.upsert({
    where: {
      ingredient_id_tag_id: {
        ingredient_id: ingredientId,
        tag_id: validation.data.tag_id,
      },
    },
    update: {},
    create: {
      ingredient_id: ingredientId,
      tag_id: validation.data.tag_id,
    },
  });

  return { success: true };
});
