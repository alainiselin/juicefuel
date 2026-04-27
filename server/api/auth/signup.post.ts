import prisma from '../../utils/prisma';
import { hashPassword } from '../../utils/auth';
import { ensureDefaultHouseholdForUser } from '../../utils/householdBootstrap';
import { z } from 'zod';

const SignupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  display_name: z.string().min(1),
});

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  
  const validation = SignupSchema.safeParse(body);
  if (!validation.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid signup data',
      data: validation.error.flatten(),
    });
  }

  const { email, password, display_name } = validation.data;

  // Check if user already exists
  const existingUser = await prisma.user_profile.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw createError({
      statusCode: 400,
      message: 'Email already registered',
    });
  }

  // Create user
  const passwordHash = await hashPassword(password);
  const user = await prisma.user_profile.create({
    data: {
      email,
      password_hash: passwordHash,
      display_name,
    },
  });

  // Create default household for new user
  await ensureDefaultHouseholdForUser(user.id, user.display_name);

  // Create session
  const session = await prisma.session.create({
    data: {
      user_id: user.id,
      session_token: crypto.randomUUID(),
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    },
  });

  // Set session cookie
  setCookie(event, 'session_token', session.session_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60, // 30 days
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
