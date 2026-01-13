import { mealPlanService } from '../../services/mealPlanService';
import { CreateMealPlanEntrySchema } from '../../../spec/schemas';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  
  const validation = CreateMealPlanEntrySchema.safeParse(body);
  if (!validation.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid meal plan entry data',
      data: validation.error.flatten(),
    });
  }

  const entry = await mealPlanService.createEntry(validation.data);

  setResponseStatus(event, 201);
  return entry;
});
