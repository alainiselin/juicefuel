import prisma from './prisma';

export async function requireAuth(event: any): Promise<string> {
  if (!event.context.userId) {
    throw createError({
      statusCode: 401,
      message: 'Authentication required',
    });
  }
  return event.context.userId;
}

export function getOptionalUserId(event: any): string | null {
  return event.context.userId || null;
}

export async function getActiveHousehold(event: any, userId: string) {
  const user = await prisma.user_profile.findUnique({
    where: { id: userId },
    select: {
      active_household_id: true,
      active_household: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!user?.active_household_id || !user.active_household) {
    throw createError({
      statusCode: 400,
      message: 'No active household set',
    });
  }

  return user.active_household;
}
