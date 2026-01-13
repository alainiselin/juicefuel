import prisma from '../../utils/prisma';
import { requireAuth } from '../../utils/authHelpers';
import { z } from 'zod';

const UpdateHouseholdSchema = z.object({
  name: z.string().min(1).max(100),
});

export default defineEventHandler(async (event) => {
  const userId = await requireAuth(event);
  const householdId = getRouterParam(event, 'id');

  if (!householdId) {
    throw createError({
      statusCode: 400,
      message: 'Household ID required',
    });
  }

  // Check if user is OWNER of this household
  const membership = await prisma.household_member.findUnique({
    where: {
      household_id_user_id: {
        household_id: householdId,
        user_id: userId,
      },
    },
  });

  if (!membership) {
    throw createError({
      statusCode: 404,
      message: 'Household not found',
    });
  }

  if (membership.role !== 'OWNER') {
    throw createError({
      statusCode: 403,
      message: 'Only household owner can rename household',
    });
  }

  const body = await readBody(event);
  const validation = UpdateHouseholdSchema.safeParse(body);

  if (!validation.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid household data',
      data: validation.error.flatten(),
    });
  }

  const household = await prisma.household.update({
    where: { id: householdId },
    data: {
      name: validation.data.name,
    },
  });

  return {
    household: {
      id: household.id,
      name: household.name,
      updated_at: household.updated_at,
    },
  };
});
