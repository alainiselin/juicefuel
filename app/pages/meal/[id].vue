<template>
  <DesktopShell>
    <div class="p-8">
      <!-- Back Button -->
      <button
        @click="goBack"
        class="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
        Back to Planner
      </button>

      <!-- Loading State -->
      <div v-if="loading" class="flex items-center justify-center py-16">
        <div class="text-center">
          <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <p class="text-gray-600">Loading meal details...</p>
        </div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="max-w-4xl mx-auto">
        <div class="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <svg class="w-12 h-12 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h2 class="text-xl font-semibold text-red-900 mb-2">Failed to load meal</h2>
          <p class="text-red-700 mb-4">{{ error }}</p>
          <button
            @click="goBack"
            class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Go Back
          </button>
        </div>
      </div>

      <!-- Meal Detail Card -->
      <MealDetailCard
        v-else-if="entry"
        :entry="entry"
        @favorite="handleFavorite"
        @delete="handleDelete"
      />
    </div>
  </DesktopShell>
</template>

<script setup lang="ts">
import type { MealPlanEntry } from '../../../spec/schemas';

const route = useRoute();
const router = useRouter();
const api = useApi();

const entry = ref<MealPlanEntry | null>(null);
const loading = ref(true);
const error = ref('');

// Load meal entry
onMounted(async () => {
  const entryId = route.params.id as string;
  
  if (!entryId) {
    error.value = 'No meal ID provided';
    loading.value = false;
    return;
  }

  try {
    // Fetch the meal entry - we need to get it via the meal plan endpoint
    // Since we don't have a direct endpoint for a single entry, we'll need to work around this
    // For now, we'll fetch from the store if available, otherwise show an error
    
    // In a real app, you'd either:
    // 1. Have a GET /api/meal-plan/:id endpoint
    // 2. Pass the entry data via router state
    // 3. Keep entries in a global store
    
    // For this implementation, we'll create a simple API call
    const response = await $fetch<MealPlanEntry>(`/api/meal-plan/${entryId}`);
    entry.value = response;
  } catch (e: any) {
    console.error('Failed to load meal entry:', e);
    error.value = e.message || 'Failed to load meal entry';
  } finally {
    loading.value = false;
  }
});

const goBack = () => {
  router.push('/plan');
};

const handleFavorite = async () => {
  if (!entry.value?.recipe_id) return;
  
  try {
    // Check if already favorited
    const favorites = await $fetch('/api/user/favorites');
    const isFavorited = favorites.some((fav: any) => fav.recipe_id === entry.value.recipe_id);
    
    if (isFavorited) {
      await $fetch('/api/user/favorites', {
        method: 'DELETE',
        body: { recipe_id: entry.value.recipe_id },
      });
    } else {
      await $fetch('/api/user/favorites', {
        method: 'POST',
        body: { recipe_id: entry.value.recipe_id },
      });
    }
  } catch (err) {
    console.error('Failed to toggle favorite:', err);
    alert('Failed to update favorite status');
  }
};

const handleDelete = async () => {
  if (!entry.value) return;
  
  try {
    const success = await api.deleteMealPlanEntry(entry.value.id);
    if (success) {
      router.push('/plan');
    } else {
      alert('Failed to delete meal');
    }
  } catch (e) {
    console.error('Delete failed:', e);
    alert('Failed to delete meal');
  }
};
</script>
