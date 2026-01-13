export default defineNuxtRouteMiddleware(async (to, from) => {
  // Skip middleware on server-side
  if (process.server) return;
  
  const { user, loading, fetchSession } = useAuth();
  
  // Fetch session on first navigation if not loaded
  if (loading.value) {
    await fetchSession();
  }
  
  const protectedRoutes = ['/plan', '/recipes', '/profile', '/settings'];
  const isProtected = protectedRoutes.some(route => to.path.startsWith(route));
  
  if (isProtected && !user.value) {
    return navigateTo('/login');
  }
  
  if (to.path === '/login' && user.value) {
    return navigateTo('/plan');
  }
});
