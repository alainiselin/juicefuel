import prisma from '../../utils/prisma';
import { requireAuth } from '../../utils/authHelpers';

export default defineEventHandler(async (event) => {
  const userId = await requireAuth(event);
  const body = await readBody(event);
  
  if (!body.household_id) {
    throw createError({
      statusCode: 400,
      message: 'household_id is required',
    });
  }

  const membership = await prisma.household_member.findUnique({
    where: {
      household_id_user_id: {
        household_id: body.household_id,
        user_id: userId,
      },
    },
  });

  if (!membership) {
    throw createError({
      statusCode: 403,
      message: 'Access denied to household',
    });
  }

  const existing = await prisma.meal_plan.findUnique({
    where: {
      household_id: body.household_id,
    },
  });

  if (existing) {
    return existing;
  }

  const mealPlan = await prisma.meal_plan.create({
    data: {
      household_id: body.household_id,
    },
  });

  return mealPlan;
});
