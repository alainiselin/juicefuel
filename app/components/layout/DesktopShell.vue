<template>
  <div class="flex h-screen bg-gray-50">
    <!-- Left Sidebar (icon-only) -->
    <aside class="w-16 bg-white border-r border-gray-200 flex flex-col">
      <div class="p-4 border-b border-gray-200">
        <div class="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
          JF
        </div>
      </div>
      
      <nav class="flex-1 py-4">
        <ul class="space-y-2">
          <li>
            <NuxtLink
              to="/profile"
              class="flex flex-col items-center gap-1 px-2 py-3 relative group"
              :class="isActive('/profile') ? 'text-blue-600' : 'text-gray-600 hover:text-gray-900'"
            >
              <User :size="24" />
              <span class="absolute left-16 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                Profile
              </span>
            </NuxtLink>
          </li>
          
          <li>
            <NuxtLink
              to="/plan"
              class="flex flex-col items-center gap-1 px-2 py-3 relative group"
              :class="isActive('/plan') ? 'text-blue-600 bg-blue-50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'"
            >
              <CalendarDays :size="24" />
              <span class="absolute left-16 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                Planner
              </span>
            </NuxtLink>
          </li>
          
          <li>
            <NuxtLink
              to="/shopping"
              class="flex flex-col items-center gap-1 px-2 py-3 relative group"
              :class="isActive('/shopping') ? 'text-blue-600 bg-blue-50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'"
            >
              <ShoppingCart :size="24" />
              <span class="absolute left-16 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                Shopping List
              </span>
            </NuxtLink>
          </li>
          
          <li>
            <NuxtLink
              to="/recipes"
              class="flex flex-col items-center gap-1 px-2 py-3 relative group"
              :class="isActive('/recipes') ? 'text-blue-600 bg-blue-50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'"
            >
              <BookOpen :size="24" />
              <span class="absolute left-16 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                Recipes
              </span>
            </NuxtLink>
          </li>
          
          <li>
            <NuxtLink
              to="/settings"
              class="flex flex-col items-center gap-1 px-2 py-3 relative group"
              :class="isActive('/settings') ? 'text-blue-600 bg-blue-50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'"
            >
              <Settings :size="24" />
              <span class="absolute left-16 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                Settings
              </span>
            </NuxtLink>
          </li>
        </ul>
      </nav>
      
      <!-- User Menu at Bottom -->
      <ClientOnly>
        <div class="mt-auto p-2 border-t border-gray-200 relative">
          <button
            v-if="user"
            @click="showUserMenu = !showUserMenu"
            class="w-full flex items-center justify-center p-2 hover:bg-gray-100 rounded-lg transition-colors relative group"
            :class="showUserMenu ? 'bg-gray-100' : ''"
          >
            <img
              v-if="user.avatar_url"
              :src="user.avatar_url"
              :alt="user.display_name"
              class="w-8 h-8 rounded-full object-cover"
            />
            <div
              v-else
              class="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-medium"
            >
              {{ user.display_name?.[0]?.toUpperCase() || 'U' }}
            </div>
            <span class="absolute left-16 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
              {{ user.display_name || user.email }}
            </span>
          </button>
          
          <!-- User Menu Dropdown -->
          <div
            v-if="showUserMenu"
            class="absolute bottom-full left-0 mb-2 w-48 bg-white shadow-lg rounded-lg border border-gray-200 py-1 z-50"
          >
            <div class="px-4 py-2 border-b border-gray-100">
              <p class="text-sm font-medium text-gray-900">{{ user?.display_name }}</p>
              <p class="text-xs text-gray-500 truncate">{{ user?.email }}</p>
            </div>
            <button
              @click="handleLogout"
              class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </ClientOnly>
    </aside>

    <!-- Main Content -->
    <main class="flex-1 overflow-auto">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
import { User, CalendarDays, BookOpen, Settings, ShoppingCart } from 'lucide-vue-next';

const route = useRoute();
const { user, logout } = useAuth();
const showUserMenu = ref(false);

const isActive = (path: string) => {
  return route.path.startsWith(path);
};

const handleLogout = async () => {
  showUserMenu.value = false;
  await logout();
};

// Close menu when clicking outside
onMounted(() => {
  const handleClickOutside = (event: MouseEvent) => {
    const target = event.target as HTMLElement;
    if (showUserMenu.value && !target.closest('.relative')) {
      showUserMenu.value = false;
    }
  };
  document.addEventListener('click', handleClickOutside);
  onUnmounted(() => {
    document.removeEventListener('click', handleClickOutside);
  });
});
</script>
