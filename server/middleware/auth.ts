import prisma from '../utils/prisma';

export default defineEventHandler(async (event) => {
  let sessionToken = getCookie(event, 'session_token');

  if (!sessionToken) {
    const authHeader = getHeader(event, 'authorization');
    if (authHeader?.startsWith('Bearer ')) {
      sessionToken = authHeader.slice('Bearer '.length).trim();
    }
  }

  if (sessionToken) {
    try {
      const session = await prisma.session.findUnique({
        where: { session_token: sessionToken },
        include: { user: true },
      });

      if (session && session.expires > new Date()) {
        event.context.user = session.user;
        event.context.userId = session.user.id;
      }
    } catch (error: any) {
      console.error('[Auth Middleware] Failed to load session', {
        code: error?.code,
        message: error?.message,
      });
    }
  }
});
