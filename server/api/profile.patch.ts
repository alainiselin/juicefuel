import { requireAuth } from '../utils/authHelpers';
import prisma from '../utils/prisma';

export default defineEventHandler(async (event) => {
  const userId = await requireAuth(event);
  const body = await readBody(event);

  // Validate input
  if (!body.display_name || typeof body.display_name !== 'string') {
    throw createError({
      statusCode: 400,
      message: 'display_name is required and must be a string',
    });
  }

  if (body.display_name.trim().length === 0) {
    throw createError({
      statusCode: 400,
      message: 'display_name cannot be empty',
    });
  }

  if (body.avatar_url !== undefined && body.avatar_url !== null && typeof body.avatar_url !== 'string') {
    throw createError({
      statusCode: 400,
      message: 'avatar_url must be a string or null',
    });
  }

  // Update user profile
  const updatedUser = await prisma.user_profile.update({
    where: { id: userId },
    data: {
      display_name: body.display_name.trim(),
      avatar_url: body.avatar_url?.trim() || null,
    },
    select: {
      id: true,
      email: true,
      display_name: true,
      avatar_url: true,
    },
  });

  return updatedUser;
});
