<template>
  <div class="min-h-screen bg-gray-50 flex items-center justify-center p-4">
    <div class="max-w-md w-full space-y-8">
      <div class="text-center">
        <h2 class="text-3xl font-bold text-gray-900">Welcome to JuiceFuel</h2>
        <p class="mt-2 text-gray-600">
          {{ mode === 'login' ? 'Sign in to your account' : 'Create your account' }}
        </p>
      </div>
      
      <div class="bg-white rounded-lg shadow p-8 space-y-6">
        <!-- Google Sign In (disabled if no env vars) -->
        <button
          v-if="googleEnabled"
          @click="loginWithGoogle"
          class="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <svg class="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>
        
        <div v-if="googleEnabled" class="relative">
          <div class="absolute inset-0 flex items-center">
            <div class="w-full border-t border-gray-300"></div>
          </div>
          <div class="relative flex justify-center text-sm">
            <span class="px-2 bg-white text-gray-500">Or</span>
          </div>
        </div>
        
        <!-- Email/Password Form -->
        <form @submit.prevent="handleSubmit" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              v-model="email"
              type="email"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="you@example.com"
            />
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              v-model="password"
              type="password"
              required
              minlength="8"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
            />
            <p v-if="mode === 'signup'" class="mt-1 text-xs text-gray-500">
              Minimum 8 characters
            </p>
          </div>
          
          <div v-if="mode === 'signup'">
            <label class="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              v-model="displayName"
              type="text"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Your Name"
            />
          </div>
          
          <div v-if="errorMessage" class="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p class="text-sm text-red-700">{{ errorMessage }}</p>
          </div>
          
          <button
            type="submit"
            :disabled="isLoading"
            class="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
          >
            {{ isLoading ? 'Please wait...' : (mode === 'login' ? 'Sign In' : 'Create Account') }}
          </button>
        </form>
        
        <div class="text-center text-sm">
          <button
            @click="toggleMode"
            class="text-blue-600 hover:underline"
          >
            {{ mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Sign in' }}
          </button>
        </div>
      </div>
      
      <!-- Dev Credentials Hint -->
      <div class="text-center text-xs text-gray-500">
        <details>
          <summary class="cursor-pointer hover:text-gray-700">Dev credentials</summary>
          <div class="mt-2 space-y-1">
            <p>test@juicefuel.local / password123</p>
            <p>second@juicefuel.local / password123</p>
          </div>
        </details>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: false
});

const { login, signup } = useAuth();
const router = useRouter();

const mode = ref<'login' | 'signup'>('login');
const email = ref('');
const password = ref('');
const displayName = ref('');
const isLoading = ref(false);
const errorMessage = ref('');
// Check if Google OAuth is configured
const googleEnabled = ref(true); // Always show button; backend will handle if not configured

const toggleMode = () => {
  mode.value = mode.value === 'login' ? 'signup' : 'login';
  errorMessage.value = '';
};

const handleSubmit = async () => {
  isLoading.value = true;
  errorMessage.value = '';
  
  try {
    if (mode.value === 'login') {
      await login(email.value, password.value);
    } else {
      if (!displayName.value.trim()) {
        errorMessage.value = 'Please enter your name';
        return;
      }
      await signup(email.value, password.value, displayName.value);
    }
    await router.push('/plan');
  } catch (error: any) {
    console.error('Auth error:', error);
    errorMessage.value = error.data?.message || error.message || 'Authentication failed. Please try again.';
  } finally {
    isLoading.value = false;
  }
};

const loginWithGoogle = () => {
  // Will be implemented when Google OAuth is configured
  window.location.href = '/api/auth/google';
};
</script>
