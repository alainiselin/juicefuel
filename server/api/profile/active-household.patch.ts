import { requireAuth } from '../../utils/authHelpers';
import prisma from '../../utils/prisma';
import { z } from 'zod';

const ActiveHouseholdSchema = z.object({
  household_id: z.string().uuid(),
});

export default defineEventHandler(async (event) => {
  const userId = await requireAuth(event);
  const body = await readBody(event);

  const validation = ActiveHouseholdSchema.safeParse(body);
  if (!validation.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid household ID',
    });
  }

  // Verify user is member of this household
  const membership = await prisma.household_member.findUnique({
    where: {
      household_id_user_id: {
        household_id: validation.data.household_id,
        user_id: userId,
      },
    },
  });

  if (!membership) {
    throw createError({
      statusCode: 404,
      message: 'Household not found or you are not a member',
    });
  }

  // Update active household
  await prisma.user_profile.update({
    where: { id: userId },
    data: {
      active_household_id: validation.data.household_id,
    },
  });

  return { success: true };
});
