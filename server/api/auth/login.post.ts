import prisma from '../../utils/prisma';
import { compare } from 'bcrypt';
import { z } from 'zod';

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  
  const validation = LoginSchema.safeParse(body);
  if (!validation.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid login data',
      data: validation.error.flatten(),
    });
  }

  const { email, password } = validation.data;

  const user = await prisma.user_profile.findUnique({
    where: { email },
  });

  if (!user || !user.password_hash) {
    throw createError({
      statusCode: 401,
      message: 'Invalid credentials',
    });
  }

  const isPasswordValid = await compare(password, user.password_hash);
  if (!isPasswordValid) {
    throw createError({
      statusCode: 401,
      message: 'Invalid credentials',
    });
  }

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
