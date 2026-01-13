import prisma from '../../../../utils/prisma';
import { requireAuth } from '../../../../utils/authHelpers';
import { z } from 'zod';

const AttachTagSchema = z.object({
  tag_id: z.string().uuid(),
});

export default defineEventHandler(async (event) => {
  const userId = await requireAuth(event);
  const itemId = getRouterParam(event, 'id');
  const body = await readBody(event);

  if (!itemId) {
    throw createError({
      statusCode: 400,
      message: 'Shopping list item ID required',
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

  const item = await prisma.shopping_list_item.findUnique({
    where: { id: itemId },
    include: {
      shopping_list: {
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

  if (!item || item.shopping_list.household.members.length === 0) {
    throw createError({
      statusCode: 404,
      message: 'Shopping list item not found',
    });
  }

  await prisma.shopping_list_item_tag.upsert({
    where: {
      shopping_list_item_id_tag_id: {
        shopping_list_item_id: itemId,
        tag_id: validation.data.tag_id,
      },
    },
    update: {},
    create: {
      shopping_list_item_id: itemId,
      tag_id: validation.data.tag_id,
    },
  });

  return { success: true };
});
