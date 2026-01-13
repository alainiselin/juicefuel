import { requireAuth } from '../../utils/authHelpers';
import prisma from '../../utils/prisma';
import { compare, hash } from 'bcrypt';

export default defineEventHandler(async (event) => {
  const userId = await requireAuth(event);
  const body = await readBody(event);

  // Validate input
  if (!body.current_password || !body.new_password) {
    throw createError({
      statusCode: 400,
      message: 'current_password and new_password are required',
    });
  }

  if (body.new_password.length < 8) {
    throw createError({
      statusCode: 400,
      message: 'New password must be at least 8 characters',
    });
  }

  // Fetch user with password_hash
  const user = await prisma.user_profile.findUnique({
    where: { id: userId },
    select: {
      id: true,
      password_hash: true,
    },
  });

  if (!user) {
    throw createError({
      statusCode: 404,
      message: 'User not found',
    });
  }

  if (!user.password_hash) {
    throw createError({
      statusCode: 400,
      message: 'Cannot change password for OAuth-only accounts',
    });
  }

  // Verify current password
  const isValid = await compare(body.current_password, user.password_hash);
  if (!isValid) {
    throw createError({
      statusCode: 400,
      message: 'Current password is incorrect',
    });
  }

  // Hash and save new password
  const newPasswordHash = await hash(body.new_password, 12);
  await prisma.user_profile.update({
    where: { id: userId },
    data: {
      password_hash: newPasswordHash,
    },
  });

  return {
    success: true,
    message: 'Password updated successfully',
  };
});
