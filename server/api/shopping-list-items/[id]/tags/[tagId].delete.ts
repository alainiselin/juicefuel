import prisma from '../../../../utils/prisma';
import { requireAuth } from '../../../../utils/authHelpers';

export default defineEventHandler(async (event) => {
  const userId = await requireAuth(event);
  const itemId = getRouterParam(event, 'id');
  const tagId = getRouterParam(event, 'tagId');

  if (!itemId || !tagId) {
    throw createError({
      statusCode: 400,
      message: 'Shopping list item ID and tag ID required',
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

  await prisma.shopping_list_item_tag.deleteMany({
    where: {
      shopping_list_item_id: itemId,
      tag_id: tagId,
    },
  });

  return { success: true };
});
