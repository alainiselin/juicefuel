<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 px-4">
    <div class="max-w-md w-full bg-white rounded-lg shadow-md p-8">
      <div v-if="loading" class="text-center">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p class="text-gray-600">Joining household...</p>
      </div>

      <div v-else-if="error" class="text-center">
        <div class="text-red-600 mb-4">
          <svg class="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 class="text-xl font-semibold text-gray-900 mb-2">Invalid Invite</h2>
        <p class="text-gray-600 mb-4">{{ error }}</p>
        <button
          @click="navigateTo('/plan')"
          class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Go to Planner
        </button>
      </div>

      <div v-else-if="success" class="text-center">
        <div class="text-green-600 mb-4">
          <svg class="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 class="text-xl font-semibold text-gray-900 mb-2">Successfully Joined!</h2>
        <p class="text-gray-600 mb-4">You've joined {{ householdName }}</p>
        <p class="text-sm text-gray-500">Redirecting to planner...</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute();
const code = route.params.code as string;

const loading = ref(true);
const error = ref('');
const success = ref(false);
const householdName = ref('');

onMounted(async () => {
  if (!code) {
    error.value = 'No invite code provided';
    loading.value = false;
    return;
  }

  try {
    const response = await $fetch('/api/households/join', {
      method: 'POST',
      body: { code },
    });

    success.value = true;
    householdName.value = response.household.name;

    // Redirect after 1.5 seconds
    setTimeout(() => {
      navigateTo('/plan');
    }, 1500);
  } catch (e: any) {
    loading.value = false;
    error.value = e.data?.message || 'Invalid or expired invite code';
  }
});
</script>
