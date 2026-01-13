import { mealPlanService } from '../../services/mealPlanService';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');
  
  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'Entry ID required',
    });
  }

  const entry = await mealPlanService.getEntry(id);
  
  if (!entry) {
    throw createError({
      statusCode: 404,
      message: 'Meal plan entry not found',
    });
  }

  return entry;
});
