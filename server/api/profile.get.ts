import { requireAuth } from '../utils/authHelpers';
import prisma from '../utils/prisma';

export default defineEventHandler(async (event) => {
  const userId = await requireAuth(event);

  const user = await prisma.user_profile.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      display_name: true,
      avatar_url: true,
      password_hash: true,
      accounts: {
        select: {
          provider: true,
        },
      },
    },
  });

  if (!user) {
    throw createError({
      statusCode: 404,
      message: 'User not found',
    });
  }

  return {
    id: user.id,
    email: user.email,
    display_name: user.display_name,
    avatar_url: user.avatar_url,
    hasPassword: !!user.password_hash,
    providers: user.accounts.map((acc) => acc.provider),
  };
});
