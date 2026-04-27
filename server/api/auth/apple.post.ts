import { z } from 'zod';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import prisma from '../../utils/prisma';
import { ensureDefaultHouseholdForUser } from '../../utils/householdBootstrap';

const AppleSchema = z.object({
  identity_token: z.string().min(1),
  email: z.string().email().optional(),
  display_name: z.string().optional(),
});

const APPLE_ISSUER = 'https://appleid.apple.com';
const JWKS = createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'));

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const parsed = AppleSchema.safeParse(body);
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid Apple sign-in payload',
      data: parsed.error.flatten(),
    });
  }

  const expectedAudience = process.env.APPLE_BUNDLE_ID;
  if (!expectedAudience) {
    console.error('APPLE_BUNDLE_ID env var is not configured');
    throw createError({ statusCode: 500, message: 'Apple sign-in not configured' });
  }

  let claims: { sub?: string; email?: string };
  try {
    const verified = await jwtVerify(parsed.data.identity_token, JWKS, {
      issuer: APPLE_ISSUER,
      audience: expectedAudience,
    });
    claims = verified.payload as typeof claims;
  } catch (err) {
    console.error('Apple identity token verification failed:', err instanceof Error ? err.message : err);
    throw createError({ statusCode: 401, message: 'Invalid Apple identity token' });
  }

  const appleUserId = claims.sub;
  if (!appleUserId) {
    throw createError({ statusCode: 401, message: 'Apple token missing sub' });
  }

  // Apple only puts email in the JWT on the first sign-in; subsequent sign-ins rely
  // on the Account record we created. Body email is a backup when iOS captured it once.
  const email = claims.email ?? parsed.data.email;

  // Resolve user: by existing Apple Account, then by email.
  let userId: string | null = null;
  const existingAccount = await prisma.account.findUnique({
    where: {
      provider_provider_account_id: { provider: 'apple', provider_account_id: appleUserId },
    },
  });
  if (existingAccount) {
    userId = existingAccount.user_id;
  } else if (email) {
    const userByEmail = await prisma.user_profile.findUnique({ where: { email } });
    if (userByEmail) userId = userByEmail.id;
  }

  let user;
  if (userId) {
    user = await prisma.user_profile.update({
      where: { id: userId },
      data: {
        display_name: parsed.data.display_name ?? undefined,
        email_verified: new Date(),
      },
    });
  } else {
    if (!email) {
      throw createError({
        statusCode: 400,
        message: 'Cannot create account without email; sign in again and share your email',
      });
    }
    user = await prisma.user_profile.create({
      data: {
        email,
        display_name: parsed.data.display_name ?? email.split('@')[0],
        email_verified: new Date(),
      },
    });
  }

  if (!existingAccount) {
    await prisma.account.create({
      data: {
        user_id: user.id,
        provider: 'apple',
        provider_account_id: appleUserId,
        type: 'oauth',
      },
    });
  }

  await ensureDefaultHouseholdForUser(user.id, user.display_name);

  const session = await prisma.session.create({
    data: {
      user_id: user.id,
      session_token: crypto.randomUUID(),
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  setCookie(event, 'session_token', session.session_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60,
    path: '/',
  });

  return {
    user: {
      id: user.id,
      email: user.email,
      display_name: user.display_name,
      avatar_url: user.avatar_url,
    },
    token: session.session_token,
  };
});
