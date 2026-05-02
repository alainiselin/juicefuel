export default defineNuxtRouteMiddleware(async (to, from) => {
  const { user, loading, fetchSession } = useAuth();

  // Fetch session on first navigation if not loaded
  if (loading.value) {
    await fetchSession();
  }

  const protectedRoutes = ['/plan', '/recipes', '/profile', '/settings', '/shopping'];
  const isProtected = protectedRoutes.some(route => to.path.startsWith(route));

  if (isProtected && !user.value) {
    return navigateTo('/login');
  }

  if (to.path === '/login' && user.value) {
    return navigateTo('/plan');
  }

});
