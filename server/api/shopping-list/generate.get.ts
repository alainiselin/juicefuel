import { shoppingListService } from '../../services/shoppingListService';
import { DateRangeQuerySchema } from '../../../spec/schemas';

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  
  const validation = DateRangeQuerySchema.safeParse(query);
  if (!validation.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid query parameters',
      data: validation.error.flatten(),
    });
  }

  const shoppingList = await shoppingListService.generateShoppingList(
    validation.data.meal_plan_id,
    validation.data.from,
    validation.data.to
  );

  return shoppingList;
});
