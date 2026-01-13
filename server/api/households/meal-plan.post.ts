import prisma from '../../utils/prisma';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  
  if (!body.household_id) {
    throw createError({
      statusCode: 400,
      message: 'household_id is required',
    });
  }

  const mealPlan = await prisma.meal_plan.create({
    data: {
      household_id: body.household_id,
    },
  });

  return mealPlan;
});
