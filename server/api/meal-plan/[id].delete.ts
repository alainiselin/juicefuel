import { mealPlanService } from '../../services/mealPlanService';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');
  
  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'Entry ID required',
    });
  }

  const deleted = await mealPlanService.deleteEntry(id);
  
  if (!deleted) {
    throw createError({
      statusCode: 404,
      message: 'Meal plan entry not found',
    });
  }

  setResponseStatus(event, 204);
  return null;
});
