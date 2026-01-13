<template>
  <DesktopShell>
    <div class="p-8">
      <button
        @click="goBack"
        class="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
        Back to Recipes
      </button>

      <div v-if="loading" class="flex items-center justify-center py-16">
        <div class="text-center">
          <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <p class="text-gray-600">Loading recipe...</p>
        </div>
      </div>

      <div v-else-if="error" class="max-w-4xl mx-auto">
        <div class="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <h2 class="text-xl font-semibold text-red-900 mb-2">Recipe not found</h2>
          <p class="text-red-700 mb-4">{{ error }}</p>
          <button @click="goBack" class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
            Go Back
          </button>
        </div>
      </div>

      <div v-else-if="recipe" class="max-w-4xl mx-auto">
        <div class="bg-white rounded-lg shadow-lg">
          <!-- Header -->
          <div class="border-b border-gray-200 p-6">
            <div class="flex items-start justify-between">
              <div class="flex-1">
                <h1 class="text-3xl font-bold text-gray-900 mb-2">{{ recipe.title }}</h1>
                <p v-if="recipe.description" class="text-gray-600 mb-3">{{ recipe.description }}</p>
                <div class="flex items-center gap-4 text-sm text-gray-500">
                  <span>{{ recipe.ingredients.length }} ingredients</span>
                  <span v-if="recipe.prep_time_minutes">
                    <svg class="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {{ recipe.prep_time_minutes }} min
                  </span>
                  <a
                    v-if="recipe.source_url"
                    :href="recipe.source_url"
                    target="_blank"
                    class="text-blue-600 hover:underline"
                  >
                    Source
                  </a>
                </div>
              </div>
              
              <div class="flex gap-2">
                <button
                  @click="toggleFavorite"
                  class="p-2 transition-colors"
                  :class="isFavorited ? 'text-yellow-500' : 'text-gray-400 hover:text-yellow-500'"
                  title="Favorite"
                >
                  <svg class="w-6 h-6" :fill="isFavorited ? 'currentColor' : 'none'" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                </button>
                
                <button
                  @click="goToEdit"
                  class="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                  title="Edit"
                >
                  <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                
                <button
                  @click="handleDelete"
                  class="p-2 text-gray-400 hover:text-red-600 transition-colors"
                  title="Delete"
                >
                  <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <!-- Content -->
          <div class="p-6 space-y-8">
            <!-- Tags -->
            <section v-if="recipe.tags && recipe.tags.length > 0">
              <h2 class="text-xl font-semibold text-gray-900 mb-3">Tags</h2>
              <div class="flex flex-wrap gap-2">
                <span
                  v-for="recipeTag in recipe.tags"
                  :key="recipeTag.tag.id"
                  class="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                >
                  {{ recipeTag.tag.name }}
                </span>
              </div>
            </section>

            <!-- Instructions -->
            <section v-if="recipe.instructions_markdown">
              <h2 class="text-xl font-semibold text-gray-900 mb-3">Instructions</h2>
              <div class="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
                {{ recipe.instructions_markdown }}
              </div>
            </section>

            <!-- Ingredients -->
            <section v-if="recipe.ingredients && recipe.ingredients.length > 0">
              <h2 class="text-xl font-semibold text-gray-900 mb-3">Ingredients</h2>
              <ul class="space-y-2">
                <li
                  v-for="(ingredient, idx) in recipe.ingredients"
                  :key="idx"
                  class="flex items-start gap-3 text-gray-700"
                >
                  <span class="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-xs text-blue-600 mt-0.5">
                    {{ idx + 1 }}
                  </span>
                  <span class="flex-1">
                    <span v-if="ingredient.quantity" class="font-medium">{{ formatQuantity(ingredient.quantity) }}</span>
                    <span v-if="ingredient.unit" class="text-gray-600 ml-1">{{ formatUnit(ingredient.unit) }}</span>
                    <span class="ml-2">{{ ingredient.ingredient.name }}</span>
                    <span v-if="ingredient.note" class="text-sm text-gray-500 ml-2">({{ ingredient.note }})</span>
                  </span>
                </li>
              </ul>
            </section>
          </div>
        </div>
      </div>
    </div>
  </DesktopShell>
</template>

<script setup lang="ts">
const route = useRoute();
const router = useRouter();
const recipeId = route.params.id as string;

const recipe = ref<any>(null);
const loading = ref(true);
const error = ref('');
const isFavorited = ref(false);

async function loadRecipe() {
  loading.value = true;
  error.value = '';
  try {
    recipe.value = await $fetch(`/api/recipes/${recipeId}`);
    await checkFavoriteStatus();
  } catch (err: any) {
    error.value = err.data?.message || 'Failed to load recipe';
  } finally {
    loading.value = false;
  }
}

async function checkFavoriteStatus() {
  try {
    const favorites = await $fetch('/api/user/favorites');
    isFavorited.value = favorites.some((fav: any) => fav.recipe_id === recipeId);
  } catch (err) {
    console.error('Failed to check favorite status:', err);
  }
}

async function toggleFavorite() {
  try {
    if (isFavorited.value) {
      await $fetch('/api/user/favorites', {
        method: 'DELETE',
        body: { recipe_id: recipeId },
      });
      isFavorited.value = false;
    } else {
      await $fetch('/api/user/favorites', {
        method: 'POST',
        body: { recipe_id: recipeId },
      });
      isFavorited.value = true;
    }
  } catch (err) {
    console.error('Failed to toggle favorite:', err);
    alert('Failed to update favorite status');
  }
}

async function handleDelete() {
  try {
    await $fetch(`/api/recipes/${recipeId}`, {
      method: 'DELETE',
    });
    router.push('/recipes');
  } catch (err) {
    console.error('Failed to delete recipe:', err);
    alert('Failed to delete recipe');
  }
}

function goBack() {
  router.push('/recipes');
}

function goToEdit() {
  router.push(`/recipes/edit-${recipeId}`);
}

function formatQuantity(qty: number | null | any): string {
  if (qty === null || qty === undefined) return '';
  // Convert Decimal or string to number
  const num = typeof qty === 'number' ? qty : Number(qty);
  if (isNaN(num)) return '';
  if (num % 1 === 0) return num.toString();
  return num.toFixed(2).replace(/\.?0+$/, '');
}

function formatUnit(unit: string | null): string {
  if (!unit) return '';
  const unitMap: Record<string, string> = {
    G: 'g',
    KG: 'kg',
    ML: 'ml',
    L: 'L',
    TBSP: 'tbsp',
    TSP: 'tsp',
    CUP: 'cup',
    PIECE: 'piece',
    PACKAGE: 'package',
  };
  return unitMap[unit] || unit.toLowerCase();
}

onMounted(() => {
  loadRecipe();
});
</script>
