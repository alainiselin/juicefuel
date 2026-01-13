import prisma from '../../utils/prisma';

export default defineEventHandler(async (event) => {
  const sessionToken = getCookie(event, 'session_token');
  
  if (sessionToken) {
    await prisma.session.deleteMany({
      where: { session_token: sessionToken },
    });
  }
  
  deleteCookie(event, 'session_token', { path: '/' });
  
  return { success: true };
});
