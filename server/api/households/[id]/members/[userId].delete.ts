import prisma from '../../../../utils/prisma';
import { requireAuth } from '../../../../utils/authHelpers';

export default defineEventHandler(async (event) => {
  const actorId = await requireAuth(event);
  const householdId = getRouterParam(event, 'id');
  const targetUserId = getRouterParam(event, 'userId');

  if (!householdId || !targetUserId) {
    throw createError({
      statusCode: 400,
      message: 'Household ID and user ID required',
    });
  }

  if (actorId === targetUserId) {
    throw createError({
      statusCode: 400,
      message: 'Use leave household to remove yourself',
    });
  }

  const actorMembership = await prisma.household_member.findUnique({
    where: {
      household_id_user_id: {
        household_id: householdId,
        user_id: actorId,
      },
    },
  });

  if (!actorMembership) {
    throw createError({ statusCode: 404, message: 'Household not found' });
  }

  if (actorMembership.role !== 'OWNER') {
    throw createError({ statusCode: 403, message: 'Only owners can remove members' });
  }

  const targetMembership = await prisma.household_member.findUnique({
    where: {
      household_id_user_id: {
        household_id: householdId,
        user_id: targetUserId,
      },
    },
  });

  if (!targetMembership) {
    throw createError({ statusCode: 404, message: 'Member not found' });
  }

  if (targetMembership.role === 'OWNER') {
    const ownerCount = await prisma.household_member.count({
      where: {
        household_id: householdId,
        role: 'OWNER',
      },
    });

    if (ownerCount <= 1) {
      throw createError({
        statusCode: 400,
        message: 'Cannot remove the last owner',
      });
    }
  }

  await prisma.$transaction([
    prisma.household_member.delete({
      where: {
        household_id_user_id: {
          household_id: householdId,
          user_id: targetUserId,
        },
      },
    }),
    prisma.user_profile.updateMany({
      where: {
        id: targetUserId,
        active_household_id: householdId,
      },
      data: {
        active_household_id: null,
      },
    }),
  ]);

  return { success: true };
});
