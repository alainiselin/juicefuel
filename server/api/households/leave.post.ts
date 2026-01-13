import prisma from '../../utils/prisma';
import { requireAuth } from '../../utils/authHelpers';
import { z } from 'zod';

const LeaveHouseholdSchema = z.object({
  household_id: z.string().uuid().optional(),
});

export default defineEventHandler(async (event) => {
  const userId = await requireAuth(event);
  const body = await readBody(event);
  
  const validation = LeaveHouseholdSchema.safeParse(body);
  if (!validation.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid request body',
    });
  }

  let householdId = validation.data.household_id;

  // If no household_id provided, use active household
  if (!householdId) {
    const user = await prisma.user_profile.findUnique({
      where: { id: userId },
      select: { active_household_id: true },
    });
    householdId = user?.active_household_id || undefined;
  }

  if (!householdId) {
    throw createError({
      statusCode: 400,
      message: 'No household specified',
    });
  }

  // Get membership
  const membership = await prisma.household_member.findUnique({
    where: {
      household_id_user_id: {
        household_id: householdId,
        user_id: userId,
      },
    },
    include: {
      household: {
        include: {
          members: true,
        },
      },
    },
  });

  if (!membership) {
    throw createError({
      statusCode: 404,
      message: 'Household not found',
    });
  }

  // Check if user is the last OWNER
  if (membership.role === 'OWNER') {
    const ownerCount = membership.household.members.filter(
      (m) => m.role === 'OWNER'
    ).length;

    if (ownerCount <= 1) {
      throw createError({
        statusCode: 400,
        message: 'Cannot leave household as the last owner. Transfer ownership or add another owner first.',
      });
    }
  }

  // If leaving active household, clear it
  const user = await prisma.user_profile.findUnique({
    where: { id: userId },
    select: { active_household_id: true },
  });

  if (user?.active_household_id === householdId) {
    await prisma.user_profile.update({
      where: { id: userId },
      data: { active_household_id: null },
    });
  }

  // Remove membership
  await prisma.household_member.delete({
    where: {
      household_id_user_id: {
        household_id: householdId,
        user_id: userId,
      },
    },
  });

  return {
    success: true,
    message: 'Successfully left household',
  };
});
