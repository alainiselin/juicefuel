import prisma from '../../utils/prisma';
import { requireAuth } from '../../utils/authHelpers';

export default defineEventHandler(async (event) => {
  const userId = await requireAuth(event);
  const householdId = getRouterParam(event, 'id');

  if (!householdId) {
    throw createError({
      statusCode: 400,
      message: 'Household ID required',
    });
  }

  const membership = await prisma.household_member.findUnique({
    where: {
      household_id_user_id: {
        household_id: householdId,
        user_id: userId,
      },
    },
  });

  if (!membership) {
    throw createError({ statusCode: 404, message: 'Household not found' });
  }

  if (membership.role !== 'OWNER') {
    throw createError({ statusCode: 403, message: 'Only owners can delete a household' });
  }

  await prisma.$transaction([
    prisma.user_profile.updateMany({
      where: { active_household_id: householdId },
      data: { active_household_id: null },
    }),
    prisma.household.delete({
      where: { id: householdId },
    }),
  ]);

  return { success: true };
});
