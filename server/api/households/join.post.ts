import prisma from '../../utils/prisma';
import { requireAuth } from '../../utils/authHelpers';
import { z } from 'zod';

const JoinHouseholdSchema = z.object({
  code: z.string().min(1),
});

export default defineEventHandler(async (event) => {
  const userId = await requireAuth(event);
  const body = await readBody(event);

  const validation = JoinHouseholdSchema.safeParse(body);
  if (!validation.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid invite code',
    });
  }

  const { code } = validation.data;

  // Find household by invite code
  const household = await prisma.household.findUnique({
    where: { invite_code: code },
  });

  if (!household) {
    throw createError({
      statusCode: 404,
      message: 'Invalid or expired invite code',
    });
  }

  // Check if user is already a member
  const existingMembership = await prisma.household_member.findUnique({
    where: {
      household_id_user_id: {
        household_id: household.id,
        user_id: userId,
      },
    },
  });

  if (existingMembership) {
    throw createError({
      statusCode: 400,
      message: 'You are already a member of this household',
    });
  }

  // Create membership
  await prisma.household_member.create({
    data: {
      household_id: household.id,
      user_id: userId,
      role: 'MEMBER',
    },
  });

  return {
    success: true,
    household: {
      id: household.id,
      name: household.name,
    },
  };
});
