import prisma from '../../utils/prisma';
import { shoppingListRepo } from '../../repos/shoppingListRepo';
import { CreateShoppingListSchema } from '../../../spec/schemas';
import { requireAuth } from '../../utils/authHelpers';

export default defineEventHandler(async (event) => {
  const userId = await requireAuth(event);
  const body = await readBody(event);

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

  // Set household_id from user context
  const data = {
    ...body,
    household_id: user.active_household_id,
  };
  
  const validation = CreateShoppingListSchema.safeParse(data);
  if (!validation.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid shopping list data',
      data: validation.error.flatten(),
    });
  }

  const list = await shoppingListRepo.create(validation.data);

  setResponseStatus(event, 201);
  return {
    id: list.id,
    household_id: list.household_id,
    title: list.title,
    status: list.status,
    store_hint: list.store_hint,
    created_at: list.created_at.toISOString(),
    updated_at: list.updated_at.toISOString(),
    items: [],
  };
});
