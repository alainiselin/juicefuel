import prisma from '../../utils/prisma';
import { requireAuth } from '../../utils/authHelpers';
import { randomBytes } from 'crypto';

function generateInviteCode(): string {
  // Generate a URL-safe 12-character code
  return randomBytes(9).toString('base64url').substring(0, 12);
}

export default defineEventHandler(async (event) => {
  const userId = await requireAuth(event);
  const config = useRuntimeConfig();
  const authOrigin = config.authOrigin || process.env.AUTH_ORIGIN || 'http://localhost:3000';

  // Get user's first household (active household for MVP)
  const membership = await prisma.household_member.findFirst({
    where: { user_id: userId },
    orderBy: { joined_at: 'asc' },
  });

  if (!membership) {
    throw createError({
      statusCode: 404,
      message: 'No household found',
    });
  }

  if (membership.role !== 'OWNER') {
    throw createError({
      statusCode: 403,
      message: 'Only household owner can generate invite links',
    });
  }

  // Generate new invite code
  let inviteCode = generateInviteCode();
  let attempts = 0;
  const maxAttempts = 5;

  // Ensure unique code (retry if collision)
  while (attempts < maxAttempts) {
    try {
      const household = await prisma.household.update({
        where: { id: membership.household_id },
        data: { invite_code: inviteCode },
      });

      const inviteUrl = `${authOrigin}/join/${household.invite_code}`;

      return {
        invite_code: household.invite_code,
        invite_url: inviteUrl,
      };
    } catch (error: any) {
      if (error.code === 'P2002') {
        // Unique constraint violation - try again with new code
        inviteCode = generateInviteCode();
        attempts++;
      } else {
        throw error;
      }
    }
  }

  throw createError({
    statusCode: 500,
    message: 'Failed to generate unique invite code',
  });
});
