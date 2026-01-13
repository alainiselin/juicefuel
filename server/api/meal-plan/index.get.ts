import { mealPlanService } from '../../services/mealPlanService';
import { requireAuth } from '../../utils/authHelpers';
import { DateRangeQuerySchema } from '../../../spec/schemas';

export default defineEventHandler(async (event) => {
  const userId = await requireAuth(event);
  const query = getQuery(event);
  
  const validation = DateRangeQuerySchema.safeParse(query);
  if (!validation.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid query parameters',
      data: validation.error.flatten(),
    });
  }

  // Verify user has access to this meal plan
  const entries = await mealPlanService.getEntriesForUser(
    userId,
    validation.data.meal_plan_id,
    validation.data.from,
    validation.data.to
  );

  return entries;
});
