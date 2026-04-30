import prisma from '../../../../utils/prisma';
import { requireAuth } from '../../../../utils/authHelpers';
import { z } from 'zod';

const UpdateMemberSchema = z.object({
  role: z.enum(['OWNER', 'ADMIN', 'MEMBER']),
});

export default defineEventHandler(async (event) => {
  const actorId = await requireAuth(event);
  const householdId = getRouterParam(event, 'id');
  const targetUserId = getRouterParam(event, 'userId');
  const body = await readBody(event);

  if (!householdId || !targetUserId) {
    throw createError({
      statusCode: 400,
      message: 'Household ID and user ID required',
    });
  }

  const validation = UpdateMemberSchema.safeParse(body);
  if (!validation.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid member role',
      data: validation.error.flatten(),
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
    throw createError({ statusCode: 403, message: 'Only owners can change member roles' });
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

  if (targetMembership.role === 'OWNER' && validation.data.role !== 'OWNER') {
    const ownerCount = await prisma.household_member.count({
      where: {
        household_id: householdId,
        role: 'OWNER',
      },
    });

    if (ownerCount <= 1) {
      throw createError({
        statusCode: 400,
        message: 'Cannot demote the last owner',
      });
    }
  }

  const updated = await prisma.household_member.update({
    where: {
      household_id_user_id: {
        household_id: householdId,
        user_id: targetUserId,
      },
    },
    data: {
      role: validation.data.role,
    },
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
  });

  return {
    user_id: updated.user_id,
    role: updated.role,
    joined_at: updated.joined_at,
    user: updated.user,
  };
});
