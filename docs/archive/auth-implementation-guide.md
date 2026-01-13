# JuiceFuel Authentication Implementation Guide

## Status: Foundation Complete ✅

### What's Been Done

1. **Database Schema Updated** ✅
   - Added `password_hash`, `email_verified` to `user_profile`
   - Added `Account` model for OAuth providers
   - Added `Session` model for session management  
   - Added `VerificationToken` for email verification
   - Migration created and applied: `20251231074949_add_auth_tables`

2. **Packages Installed** ✅
   - `@auth/core` - Auth.js core
   - `@auth/prisma-adapter` - Prisma adapter
   - `next-auth@beta` - Next Auth v5
   - `bcrypt` + `@types/bcrypt` - Password hashing

3. **Server Utilities Created** ✅
   - `server/utils/auth.ts` - Auth configuration with Google OAuth + Credentials
   - `server/api/auth/signup.post.ts` - Email/password signup endpoint

### Implementation Roadmap

## Phase 1: Complete Auth API (Next Steps)

### 1.1 Create Login Endpoint
File: `server/api/auth/login.post.ts`
```typescript
import { prisma } from '../../utils/prisma';
import { compare } from 'bcrypt';

export default defineEventHandler(async (event) => {
  const { email, password } = await readBody(event);
  
  const user = await prisma.user_profile.findUnique({
    where: { email }
  });
  
  if (!user || !user.password_hash) {
    throw createError({ statusCode: 401, message: 'Invalid credentials' });
  }
  
  const valid = await compare(password, user.password_hash);
  if (!valid) {
    throw createError({ statusCode: 401, message: 'Invalid credentials' });
  }
  
  // Create session
  const session = await prisma.session.create({
    data: {
      user_id: user.id,
      session_token: crypto.randomUUID(),
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    }
  });
  
  setCookie(event, 'session_token', session.session_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60,
    path: '/'
  });
  
  return { user: { id: user.id, email: user.email, display_name: user.display_name } };
});
```

### 1.2 Create Logout Endpoint
File: `server/api/auth/logout.post.ts`
```typescript
import { prisma } from '../../utils/prisma';

export default defineEventHandler(async (event) => {
  const sessionToken = getCookie(event, 'session_token');
  
  if (sessionToken) {
    await prisma.session.deleteMany({
      where: { session_token: sessionToken }
    });
  }
  
  deleteCookie(event, 'session_token');
  return { success: true };
});
```

### 1.3 Create Session Check Endpoint
File: `server/api/auth/session.get.ts`
```typescript
import { prisma } from '../../utils/prisma';

export default defineEventHandler(async (event) => {
  const sessionToken = getCookie(event, 'session_token');
  
  if (!sessionToken) {
    return { user: null };
  }
  
  const session = await prisma.session.findUnique({
    where: { session_token: sessionToken },
    include: { user: true }
  });
  
  if (!session || session.expires < new Date()) {
    deleteCookie(event, 'session_token');
    return { user: null };
  }
  
  return {
    user: {
      id: session.user.id,
      email: session.user.email,
      display_name: session.user.display_name,
      avatar_url: session.user.avatar_url
    }
  };
});
```

### 1.4 Create Google OAuth Endpoints
File: `server/api/auth/google.get.ts` (Initiate OAuth)
File: `server/api/auth/google/callback.get.ts` (Handle callback)

Reference: https://developers.google.com/identity/protocols/oauth2/web-server

## Phase 2: Auth Middleware

### 2.1 Server Middleware for Session
File: `server/middleware/auth.ts`
```typescript
import { prisma } from '../utils/prisma';

export default defineEventHandler(async (event) => {
  const sessionToken = getCookie(event, 'session_token');
  
  if (sessionToken) {
    const session = await prisma.session.findUnique({
      where: { session_token: sessionToken },
      include: { user: true }
    });
    
    if (session && session.expires > new Date()) {
      event.context.user = session.user;
      event.context.userId = session.user.id;
    }
  }
});
```

### 2.2 Route Protection Middleware
File: `app/middleware/auth.global.ts`
```typescript
export default defineNuxtRouteMiddleware((to, from) => {
  const protectedRoutes = ['/plan', '/recipes', '/profile', '/settings'];
  const isProtected = protectedRoutes.some(route => to.path.startsWith(route));
  
  if (isProtected) {
    const { data: session, status } = useAuth();
    
    if (status.value === 'unauthenticated') {
      return navigateTo('/login');
    }
  }
  
  if (to.path === '/login' && status.value === 'authenticated') {
    return navigateTo('/plan');
  }
});
```

## Phase 3: Frontend Components

### 3.1 Auth Composable
File: `app/composables/useAuth.ts`
```typescript
export const useAuth = () => {
  const user = useState<any>('user', () => null);
  const loading = useState('auth-loading', () => true);
  
  const fetchSession = async () => {
    try {
      const data = await $fetch('/api/auth/session');
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
      body: { email, password }
    });
    user.value = data.user;
    return data;
  };
  
  const signup = async (email: string, password: string, display_name: string) => {
    const data = await $fetch('/api/auth/signup', {
      method: 'POST',
      body: { email, password, display_name }
    });
    user.value = data.user;
    return data;
  };
  
  const logout = async () => {
    await $fetch('/api/auth/logout', { method: 'POST' });
    user.value = null;
    navigateTo('/login');
  };
  
  return {
    user: readonly(user),
    loading: readonly(loading),
    fetchSession,
    login,
    signup,
    logout
  };
};
```

### 3.2 Login Page
File: `app/pages/login.vue`
```vue
<template>
  <div class="min-h-screen bg-gray-50 flex items-center justify-center p-4">
    <div class="max-w-md w-full space-y-8">
      <div class="text-center">
        <h2 class="text-3xl font-bold text-gray-900">Welcome to JuiceFuel</h2>
        <p class="mt-2 text-gray-600">Sign in to your account</p>
      </div>
      
      <div class="bg-white rounded-lg shadow p-8 space-y-6">
        <!-- Google Sign In -->
        <button
          @click="loginWithGoogle"
          class="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          <svg class="w-5 h-5" viewBox="0 0 24 24"><!-- Google icon --></svg>
          Continue with Google
        </button>
        
        <div class="relative">
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
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              v-model="password"
              type="password"
              required
              minlength="8"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div v-if="mode === 'signup'">
            <label class="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              v-model="displayName"
              type="text"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <button
            type="submit"
            :disabled="loading"
            class="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
          >
            {{ mode === 'login' ? 'Sign In' : 'Create Account' }}
          </button>
        </form>
        
        <div class="text-center text-sm">
          <button
            @click="toggleMode"
            class="text-blue-600 hover:underline"
          >
            {{ mode === 'login' ? 'Need an account? Sign up' : 'Already have an account? Sign in' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { login, signup } = useAuth();
const router = useRouter();

const mode = ref<'login' | 'signup'>('login');
const email = ref('');
const password = ref('');
const displayName = ref('');
const loading = ref(false);

const toggleMode = () => {
  mode.value = mode.value === 'login' ? 'signup' : 'login';
};

const handleSubmit = async () => {
  loading.value = true;
  try {
    if (mode.value === 'login') {
      await login(email.value, password.value);
    } else {
      await signup(email.value, password.value, displayName.value);
    }
    router.push('/plan');
  } catch (error: any) {
    alert(error.data?.message || 'Authentication failed');
  } finally {
    loading.value = false;
  }
};

const loginWithGoogle = () => {
  window.location.href = '/api/auth/google';
};
</script>
```

### 3.3 Update DesktopShell with User Menu
Add to `app/components/layout/DesktopShell.vue`:
```vue
<!-- In sidebar, add user menu at bottom -->
<div class="mt-auto p-4 border-t border-gray-200">
  <button
    v-if="user"
    @click="showUserMenu = !showUserMenu"
    class="w-full flex items-center gap-2 p-2 hover:bg-gray-100 rounded-lg"
  >
    <img
      v-if="user.avatar_url"
      :src="user.avatar_url"
      class="w-8 h-8 rounded-full"
    />
    <div v-else class="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white">
      {{ user.display_name?.[0]?.toUpperCase() }}
    </div>
  </button>
  
  <!-- User Menu Dropdown -->
  <div v-if="showUserMenu" class="absolute bottom-16 left-2 bg-white shadow-lg rounded-lg p-2">
    <button @click="handleLogout" class="w-full text-left px-4 py-2 hover:bg-gray-100 rounded">
      Logout
    </button>
  </div>
</div>

<script setup>
const { user, logout } = useAuth();
const showUserMenu = ref(false);

const handleLogout = async () => {
  await logout();
  showUserMenu.value = false;
};
</script>
```

## Phase 4: Update API Endpoints for User Isolation

### 4.1 Add Auth Helper
File: `server/utils/authHelpers.ts`
```typescript
export async function requireAuth(event: any) {
  if (!event.context.userId) {
    throw createError({
      statusCode: 401,
      message: 'Authentication required'
    });
  }
  return event.context.userId;
}
```

### 4.2 Update Existing Endpoints
Example: `server/api/recipes/index.get.ts`
```typescript
import { requireAuth } from '../../utils/authHelpers';

export default defineEventHandler(async (event) => {
  const userId = await requireAuth(event);
  
  // Get user's households
  const households = await prisma.household_member.findMany({
    where: { user_id: userId },
    include: { household: { include: { recipe_libraries: true } } }
  });
  
  const libraryIds = households.flatMap(h => 
    h.household.recipe_libraries.map(l => l.id)
  );
  
  // Filter recipes by user's libraries
  const recipes = await prisma.recipe.findMany({
    where: { recipe_library_id: { in: libraryIds } },
    include: { ingredients: { include: { ingredient: true } } }
  });
  
  return recipes;
});
```

## Phase 5: Update Seed Script

File: `prisma/seed.ts`
Update to use a specific test user with password:
```typescript
// Create test user with password
const user = await prisma.user_profile.upsert({
  where: { email: "test@juicefuel.local" },
  update: {},
  create: {
    email: "test@juicefuel.local",
    display_name: "Test User",
    password_hash: await hashPassword("password123"), // Import from server/utils/auth
  },
});
```

## Phase 6: Google OAuth Setup

### GCP Console Configuration

1. Go to: https://console.cloud.google.com/apis/credentials
2. Create OAuth 2.0 Client ID
3. Application type: Web application
4. Add Authorized redirect URIs:
   - Local dev: `http://localhost:3000/api/auth/google/callback`
   - Production: `https://juicecrew.vip/api/auth/google/callback`
5. Copy Client ID and Client Secret

### Environment Variables

Add to `.env`:
```env
# Auth Configuration
AUTH_SECRET="your-random-32-char-secret-here"
AUTH_ORIGIN="http://localhost:3000"  # or https://juicecrew.vip in production

# Google OAuth
GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-client-secret"

# For Google Workspace (optional)
# GOOGLE_HD="juicecrew.vip"  # Restrict to domain
```

### OAuth Consent Screen
- App name: JuiceFuel
- User support email: your-email@juicecrew.vip
- Logo: (optional)
- Scopes: email, profile, openid

## Testing Checklist

### Manual Tests
- [ ] Visit /plan while logged out → redirect to /login
- [ ] Sign up with email/password → creates account + logs in
- [ ] Log out → redirects to /login
- [ ] Log in with email/password → succeeds
- [ ] Session persists across page refresh
- [ ] Google login flow (once configured)
- [ ] User only sees their own recipes/meals
- [ ] Multiple users can coexist with isolated data

### API Tests
```bash
# Signup
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","display_name":"Test"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Check session (with cookie)
curl -X GET http://localhost:3000/api/auth/session \
  --cookie "session_token=..."

# Logout
curl -X POST http://localhost:3000/api/auth/logout \
  --cookie "session_token=..."
```

## Security Notes

1. **Production Checklist**:
   - [ ] Change `AUTH_SECRET` to random 32+ char string
   - [ ] Enable HTTPS (secure cookies)
   - [ ] Set up CORS properly
   - [ ] Rate limit login/signup endpoints
   - [ ] Add CSRF protection
   - [ ] Enable email verification

2. **Password Requirements**:
   - Minimum 8 characters
   - Consider adding: uppercase, lowercase, number, special char

3. **Session Management**:
   - 30-day expiry (configurable)
   - HttpOnly cookies (XSS protection)
   - SameSite=Lax (CSRF protection)

## Next Steps Priority

1. **High Priority** (Required for MVP):
   - [ ] Create login.post.ts endpoint
   - [ ] Create logout.post.ts endpoint
   - [ ] Create session.get.ts endpoint
   - [ ] Create auth middleware (server + client)
   - [ ] Create useAuth composable
   - [ ] Create login page UI
   - [ ] Update API endpoints for user isolation
   - [ ] Update seed script

2. **Medium Priority**:
   - [ ] Implement Google OAuth flow
   - [ ] Update DesktopShell with user menu
   - [ ] Add loading states
   - [ ] Add error handling

3. **Low Priority** (Post-MVP):
   - [ ] Email verification
   - [ ] Password reset
   - [ ] Remember me functionality
   - [ ] Account settings page
   - [ ] 2FA support

## Estimated Implementation Time

- Phase 1-2: 2-3 hours (Auth API + middleware)
- Phase 3: 2-3 hours (Frontend components)
- Phase 4: 3-4 hours (Update all API endpoints)
- Phase 5: 1 hour (Seed script)
- Phase 6: 1-2 hours (Google OAuth)

**Total: ~12-15 hours for complete MVP**

## Current Progress: ~25% Complete

✅ Database schema
✅ Auth utilities foundation
✅ Signup endpoint
⏳ Remaining endpoints
⏳ Middleware
⏳ Frontend
⏳ Data isolation
⏳ Google OAuth

This guide provides a complete roadmap. You can now:
1. Follow the phases in order
2. Test each component independently
3. Deploy incrementally
