import prisma from '../utils/prisma';

export default defineEventHandler(async (event) => {
  const sessionToken = getCookie(event, 'session_token');
  
  if (sessionToken) {
    const session = await prisma.session.findUnique({
      where: { session_token: sessionToken },
      include: { user: true },
    });
    
    if (session && session.expires > new Date()) {
      event.context.user = session.user;
      event.context.userId = session.user.id;
    }
  }
});
