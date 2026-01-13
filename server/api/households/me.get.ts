import prisma from '../../utils/prisma';
import { requireAuth } from '../../utils/authHelpers';

export default defineEventHandler(async (event) => {
  const userId = await requireAuth(event);

  // Get user with active household
  const user = await prisma.user_profile.findUnique({
    where: { id: userId },
    select: {
      active_household_id: true,
    },
  });

  let activeHouseholdId = user?.active_household_id;

  // If no active household, get user's first household
  if (!activeHouseholdId) {
    const firstMembership = await prisma.household_member.findFirst({
      where: { user_id: userId },
      orderBy: { joined_at: 'asc' },
    });
    
    if (!firstMembership) {
      throw createError({
        statusCode: 404,
        message: 'No household found',
      });
    }

    activeHouseholdId = firstMembership.household_id;

    // Set it as active for next time
    await prisma.user_profile.update({
      where: { id: userId },
      data: { active_household_id: activeHouseholdId },
    });
  }

  // Get the active household with members
  const household = await prisma.household.findUnique({
    where: { id: activeHouseholdId },
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              email: true,
              display_name: true,
              avatar_url: true,
            },
          },
        },
        orderBy: {
          joined_at: 'asc',
        },
      },
    },
  });

  if (!household) {
    throw createError({
      statusCode: 404,
      message: 'Active household not found',
    });
  }

  // Find user's role
  const userMembership = household.members.find(m => m.user_id === userId);

  return {
    household: {
      id: household.id,
      name: household.name,
      invite_code: household.invite_code,
      created_at: household.created_at,
      updated_at: household.updated_at,
    },
    members: household.members.map((member) => ({
      user_id: member.user_id,
      role: member.role,
      joined_at: member.joined_at,
      user: member.user,
    })),
    userRole: userMembership?.role,
  };
});
