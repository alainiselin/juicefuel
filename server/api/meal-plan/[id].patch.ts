import { mealPlanService } from '../../services/mealPlanService';
import { UpdateMealPlanEntrySchema } from '../../../spec/schemas';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');
  
  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'Entry ID required',
    });
  }

  const body = await readBody(event);
  
  const validation = UpdateMealPlanEntrySchema.safeParse(body);
  if (!validation.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid meal plan entry data',
      data: validation.error.flatten(),
    });
  }

  const entry = await mealPlanService.updateEntry(id, validation.data);
  
  if (!entry) {
    throw createError({
      statusCode: 404,
      message: 'Meal plan entry not found',
    });
  }

  return entry;
});
