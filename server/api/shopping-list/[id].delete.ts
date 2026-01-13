import { shoppingListRepo } from '../../repos/shoppingListRepo';
import { requireAuth } from '../../utils/authHelpers';

export default defineEventHandler(async (event) => {
  await requireAuth(event);
  
  const id = getRouterParam(event, 'id');
  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'Shopping list ID required',
    });
  }

  await shoppingListRepo.delete(id);

  setResponseStatus(event, 204);
  return null;
});
