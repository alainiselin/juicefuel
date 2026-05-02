export const useAuth = () => {
  const user = useState<any>('auth-user', () => null);
  const loading = useState('auth-loading', () => true);
  
  const fetchSession = async () => {
    try {
      const requestFetch = process.server ? useRequestFetch() : $fetch;
      const data = await requestFetch('/api/auth/session');
      user.value = data.user;
    } catch (error) {
      user.value = null;
    } finally {
      loading.value = false;
    }
  };
  
  const login = async (email: string, password: string) => {
    const data = await $fetch('/api/auth/login', {
      method: 'POST',
      body: { email, password },
    });
    user.value = data.user;
    return data;
  };
  
  const signup = async (email: string, password: string, display_name: string) => {
    const data = await $fetch('/api/auth/signup', {
      method: 'POST',
      body: { email, password, display_name },
    });
    user.value = data.user;
    return data;
  };
  
  const logout = async () => {
    await $fetch('/api/auth/logout', { method: 'POST' });
    user.value = null;
    await navigateTo('/login');
  };
  
  const refreshSession = async () => {
    await fetchSession();
  };
  
  return {
    user: readonly(user),
    loading: readonly(loading),
    fetchSession,
    login,
    signup,
    logout,
    refreshSession,
  };
};
