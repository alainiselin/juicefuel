import prisma from '../../utils/prisma';

export default defineEventHandler(async (event) => {
  const sessionToken = getCookie(event, 'session_token');

  if (!sessionToken) {
    return { user: null };
  }

  try {
    const session = await prisma.session.findUnique({
      where: { session_token: sessionToken },
      include: { user: true },
    });

    if (!session || session.expires < new Date()) {
      if (session) {
        await prisma.session.delete({
          where: { id: session.id },
        });
      }
      deleteCookie(event, 'session_token', { path: '/' });
      return { user: null };
    }

    return {
      user: {
        id: session.user.id,
        email: session.user.email,
        display_name: session.user.display_name,
        avatar_url: session.user.avatar_url,
      },
    };
  } catch (error: any) {
    console.error('[Auth Session] Failed to load session', {
      code: error?.code,
      message: error?.message,
    });
    deleteCookie(event, 'session_token', { path: '/' });
    return { user: null };
  }
});
