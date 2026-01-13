<script setup lang="ts">
import { AlertCircle, CheckCircle2, User } from 'lucide-vue-next';

const { user, logout, refreshSession } = useAuth();

// Profile data
const profile = ref<any>(null);
const loading = ref(true);
const error = ref<string | null>(null);

// Edit profile form
const editForm = ref({
  display_name: '',
  avatar_url: '',
});
const editLoading = ref(false);
const editSuccess = ref(false);
const editError = ref<string | null>(null);

// Change password form
const passwordForm = ref({
  current_password: '',
  new_password: '',
  confirm_new_password: '',
});
const passwordLoading = ref(false);
const passwordSuccess = ref(false);
const passwordError = ref<string | null>(null);

// Fetch profile data
const fetchProfile = async () => {
  try {
    loading.value = true;
    error.value = null;
    const data = await $fetch('/api/profile');
    profile.value = data;
    editForm.value.display_name = data.display_name || '';
    editForm.value.avatar_url = data.avatar_url || '';
  } catch (err: any) {
    error.value = err.data?.message || 'Failed to load profile';
  } finally {
    loading.value = false;
  }
};

// Update profile
const updateProfile = async () => {
  try {
    editLoading.value = true;
    editSuccess.value = false;
    editError.value = null;

    await $fetch('/api/profile', {
      method: 'PATCH',
      body: {
        display_name: editForm.value.display_name,
        avatar_url: editForm.value.avatar_url || null,
      },
    });

    editSuccess.value = true;
    await refreshSession();
    await fetchProfile();

    setTimeout(() => {
      editSuccess.value = false;
    }, 3000);
  } catch (err: any) {
    editError.value = err.data?.message || 'Failed to update profile';
  } finally {
    editLoading.value = false;
  }
};

// Change password
const changePassword = async () => {
  try {
    passwordLoading.value = true;
    passwordSuccess.value = false;
    passwordError.value = null;

    if (passwordForm.value.new_password !== passwordForm.value.confirm_new_password) {
      passwordError.value = 'New passwords do not match';
      return;
    }

    if (passwordForm.value.new_password.length < 8) {
      passwordError.value = 'New password must be at least 8 characters';
      return;
    }

    await $fetch('/api/profile/password', {
      method: 'POST',
      body: {
        current_password: passwordForm.value.current_password,
        new_password: passwordForm.value.new_password,
      },
    });

    passwordSuccess.value = true;
    passwordForm.value.current_password = '';
    passwordForm.value.new_password = '';
    passwordForm.value.confirm_new_password = '';

    setTimeout(() => {
      passwordSuccess.value = false;
    }, 3000);
  } catch (err: any) {
    passwordError.value = err.data?.message || 'Failed to change password';
  } finally {
    passwordLoading.value = false;
  }
};

// Load profile on mount
onMounted(() => {
  fetchProfile();
});
</script>

<template>
  <DesktopShell>
    <div class="p-8">
      <div class="max-w-3xl mx-auto">
        <h1 class="text-3xl font-bold text-gray-900 mb-8">Profile</h1>

        <!-- Loading state -->
        <div v-if="loading" class="bg-white rounded-lg border border-gray-200 p-8">
          <div class="animate-pulse space-y-4">
            <div class="h-4 bg-gray-200 rounded w-1/4"></div>
            <div class="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>

        <!-- Error state -->
        <div
          v-else-if="error"
          class="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3"
        >
          <AlertCircle class="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p class="font-medium text-red-900">Error loading profile</p>
            <p class="text-sm text-red-700 mt-1">{{ error }}</p>
          </div>
        </div>

        <!-- Profile content -->
        <div v-else-if="profile" class="space-y-6">
          <!-- Profile Info Card -->
          <div class="bg-white rounded-lg border border-gray-200 p-6">
            <div class="flex items-start justify-between mb-6">
              <div>
                <h2 class="text-xl font-semibold text-gray-900">Profile Information</h2>
                <p class="text-sm text-gray-600 mt-1">
                  Your account details and authentication methods
                </p>
              </div>
              <button
                @click="logout"
                class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Log Out
              </button>
            </div>

            <div class="space-y-4">
              <!-- Avatar -->
              <div class="flex items-center gap-4">
                <div
                  class="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden"
                >
                  <img
                    v-if="profile.avatar_url"
                    :src="profile.avatar_url"
                    :alt="profile.display_name"
                    class="w-full h-full object-cover"
                  />
                  <User v-else class="w-10 h-10 text-gray-400" />
                </div>
                <div>
                  <p class="font-medium text-gray-900">{{ profile.display_name }}</p>
                  <p class="text-sm text-gray-600">{{ profile.email }}</p>
                </div>
              </div>

              <!-- Auth providers -->
              <div class="pt-4 border-t border-gray-200">
                <p class="text-sm font-medium text-gray-700 mb-2">Authentication Methods</p>
                <div class="flex flex-wrap gap-2">
                  <span
                    v-for="provider in profile.providers"
                    :key="provider"
                    class="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium capitalize"
                  >
                    {{ provider }}
                  </span>
                  <span
                    v-if="profile.hasPassword && profile.providers.length === 0"
                    class="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium"
                  >
                    Email/Password
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Edit Profile Card -->
          <div class="bg-white rounded-lg border border-gray-200 p-6">
            <h2 class="text-xl font-semibold text-gray-900 mb-4">Edit Profile</h2>

            <form @submit.prevent="updateProfile" class="space-y-4">
              <div>
                <label for="display_name" class="block text-sm font-medium text-gray-700 mb-1">
                  Display Name
                </label>
                <input
                  id="display_name"
                  v-model="editForm.display_name"
                  type="text"
                  required
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label for="avatar_url" class="block text-sm font-medium text-gray-700 mb-1">
                  Avatar URL
                </label>
                <input
                  id="avatar_url"
                  v-model="editForm.avatar_url"
                  type="url"
                  placeholder="https://example.com/avatar.jpg"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <!-- Success message -->
              <div
                v-if="editSuccess"
                class="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2"
              >
                <CheckCircle2 class="w-5 h-5 text-green-600" />
                <p class="text-sm text-green-800">Profile updated successfully!</p>
              </div>

              <!-- Error message -->
              <div
                v-if="editError"
                class="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2"
              >
                <AlertCircle class="w-5 h-5 text-red-600 flex-shrink-0" />
                <p class="text-sm text-red-800">{{ editError }}</p>
              </div>

              <button
                type="submit"
                :disabled="editLoading"
                class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {{ editLoading ? 'Saving...' : 'Save Changes' }}
              </button>
            </form>
          </div>

          <!-- Change Password Card (only show if user has password) -->
          <div v-if="profile.hasPassword" class="bg-white rounded-lg border border-gray-200 p-6">
            <h2 class="text-xl font-semibold text-gray-900 mb-4">Change Password</h2>

            <form @submit.prevent="changePassword" class="space-y-4">
              <div>
                <label for="current_password" class="block text-sm font-medium text-gray-700 mb-1">
                  Current Password
                </label>
                <input
                  id="current_password"
                  v-model="passwordForm.current_password"
                  type="password"
                  required
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label for="new_password" class="block text-sm font-medium text-gray-700 mb-1">
                  New Password
                </label>
                <input
                  id="new_password"
                  v-model="passwordForm.new_password"
                  type="password"
                  required
                  minlength="8"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p class="text-xs text-gray-500 mt-1">Minimum 8 characters</p>
              </div>

              <div>
                <label for="confirm_new_password" class="block text-sm font-medium text-gray-700 mb-1">
                  Confirm New Password
                </label>
                <input
                  id="confirm_new_password"
                  v-model="passwordForm.confirm_new_password"
                  type="password"
                  required
                  minlength="8"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <!-- Success message -->
              <div
                v-if="passwordSuccess"
                class="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2"
              >
                <CheckCircle2 class="w-5 h-5 text-green-600" />
                <p class="text-sm text-green-800">Password changed successfully!</p>
              </div>

              <!-- Error message -->
              <div
                v-if="passwordError"
                class="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2"
              >
                <AlertCircle class="w-5 h-5 text-red-600 flex-shrink-0" />
                <p class="text-sm text-red-800">{{ passwordError }}</p>
              </div>

              <button
                type="submit"
                :disabled="passwordLoading"
                class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {{ passwordLoading ? 'Changing...' : 'Change Password' }}
              </button>
            </form>
          </div>

          <!-- OAuth-only notice -->
          <div v-else class="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h2 class="text-xl font-semibold text-blue-900 mb-2">Password Management</h2>
            <p class="text-sm text-blue-800">
              You signed in with {{ profile.providers.join(', ') }}. Password management is not available for OAuth-only accounts.
            </p>
          </div>
        </div>
      </div>
    </div>
  </DesktopShell>
</template>
