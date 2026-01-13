import { shoppingListRepo } from '../../repos/shoppingListRepo';
import { requireAuth } from '../../utils/authHelpers';

export default defineEventHandler(async (event) => {
  await requireAuth(event);
  
  const itemId = getRouterParam(event, 'itemId');
  if (!itemId) {
    throw createError({
      statusCode: 400,
      message: 'Item ID required',
    });
  }

  await shoppingListRepo.deleteItem(itemId);

  setResponseStatus(event, 204);
  return null;
});
