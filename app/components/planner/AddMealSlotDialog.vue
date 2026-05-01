<template>
  <div
    v-if="modelValue"
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
    @click.self="$emit('update:modelValue', false)"
  >
    <div class="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] shadow-xl flex flex-col">
      <h2 class="text-2xl font-bold text-gray-900 mb-4">Add Meal</h2>
      
      <!-- Date & Slot Selection -->
      <div class="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Date</label>
          <input
            v-model="form.date"
            type="date"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Meal Slot</label>
          <select
            v-model="form.slot"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          >
            <option value="BREAKFAST">Breakfast</option>
            <option value="LUNCH">Lunch</option>
            <option value="DINNER">Dinner</option>
          </select>
        </div>
      </div>

      <!-- Mode toggle: pick a recipe vs free-text title -->
      <div class="mb-4 flex gap-2">
        <button
          type="button"
          @click="setMode('recipe')"
          class="flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors"
          :class="mode === 'recipe'
            ? 'border-blue-600 bg-blue-50 text-blue-700'
            : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'"
        >
          Pick a recipe
        </button>
        <button
          type="button"
          @click="setMode('title')"
          class="flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors"
          :class="mode === 'title'
            ? 'border-blue-600 bg-blue-50 text-blue-700'
            : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'"
        >
          Just a title
        </button>
      </div>

      <!-- Title-only mode -->
      <div v-if="mode === 'title'" class="mb-4">
        <label class="block text-sm font-medium text-gray-700 mb-1">Title</label>
        <input
          v-model="form.title"
          type="text"
          placeholder="e.g. Pizza takeout, Mom's lasagna"
          maxlength="200"
          class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <p class="text-xs text-gray-500 mt-1">No recipe is attached. The meal won't contribute to generated shopping lists.</p>
      </div>

      <!-- Search & Filter Bar (recipe mode only) -->
      <div v-if="mode === 'recipe'" class="mb-4 space-y-3">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Search Recipes</label>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search by title or tags (e.g. 'mexican vegan')..."
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            @input="onSearchChange"
          />
          <p class="text-xs text-gray-500 mt-1">Search works across all libraries and recipe tags</p>
        </div>

        <div v-if="!searchQuery">
          <label class="block text-sm font-medium text-gray-700 mb-1">Filter by Library (optional)</label>
          <select
            v-model="selectedLibraryId"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Libraries</option>
            <option
              v-for="lib in libraries"
              :key="lib.id"
              :value="lib.id"
            >
              {{ lib.name }} ({{ lib.recipe_count }})
              {{ lib.is_public ? '🌐' : '' }}
            </option>
          </select>
        </div>
      </div>

      <!-- Recipe Selection Grid -->
      <div v-if="mode === 'recipe'" class="flex-1 overflow-y-auto mb-4 border-t border-gray-200 pt-4">
        <div v-if="loadingRecipes" class="text-center py-8">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p class="text-gray-600 mt-2">Loading recipes...</p>
        </div>

        <div v-else-if="filteredRecipes.length === 0" class="text-center py-12">
          <svg class="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p class="text-gray-600">
            {{ searchQuery ? 'No recipes found matching your search' : 'No recipes available' }}
          </p>
        </div>

        <div v-else class="grid grid-cols-2 gap-3">
          <button
            v-for="recipe in filteredRecipes"
            :key="recipe.id"
            @click="selectRecipe(recipe)"
            class="text-left p-4 border-2 rounded-lg transition-all hover:border-blue-500 hover:shadow-md"
            :class="{
              'border-blue-500 bg-blue-50': form.recipe_id === recipe.id,
              'border-gray-200': form.recipe_id !== recipe.id,
            }"
          >
            <div class="flex items-start justify-between">
              <div class="flex-1">
                <h3 class="font-semibold text-gray-900 mb-1">{{ recipe.title }}</h3>
                <div class="flex items-center gap-2 text-xs text-gray-600 mb-1">
                  <span>{{ recipe.ingredients?.length || 0 }} ingredients</span>
                  <span v-if="getRecipeLibrary(recipe.recipe_library_id)" class="px-2 py-0.5 bg-gray-100 rounded-full">
                    {{ getRecipeLibrary(recipe.recipe_library_id)?.name }}
                  </span>
                </div>
                <div v-if="recipe.tags && recipe.tags.length > 0" class="flex flex-wrap gap-1 mt-1">
                  <span
                    v-for="tag in recipe.tags.slice(0, 3)"
                    :key="tag.id"
                    class="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px]"
                  >
                    {{ tag.name }}
                  </span>
                  <span v-if="recipe.tags.length > 3" class="text-[10px] text-gray-500">
                    +{{ recipe.tags.length - 3 }}
                  </span>
                </div>
              </div>
              <div
                v-if="form.recipe_id === recipe.id"
                class="flex-shrink-0 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center"
              >
                <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
              </div>
            </div>
          </button>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex gap-3 pt-4 border-t border-gray-200">
        <button
          @click="handleSubmit"
          class="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="loading || !canSubmit"
        >
          {{ loading ? 'Adding...' : 'Add Meal' }}
        </button>
        <button
          type="button"
          @click="$emit('update:modelValue', false)"
          class="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
          :disabled="loading"
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Recipe } from '../../../spec/schemas';

const props = defineProps<{
  modelValue: boolean;
  mealPlanId: string;
  recipes: Recipe[];
  defaultDate?: string;
  defaultSlot?: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  success: [];
}>();

const loading = ref(false);
const loadingRecipes = ref(false);
const searchQuery = ref('');
const selectedLibraryId = ref('');
const libraries = ref<any[]>([]);
const allRecipes = ref<Recipe[]>([]);

const toLocalDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const mode = ref<'recipe' | 'title'>('recipe');

const form = ref({
  date: props.defaultDate || toLocalDateKey(new Date()),
  slot: props.defaultSlot || 'DINNER',
  recipe_id: '',
  title: '',
});

const canSubmit = computed(() => {
  if (mode.value === 'recipe') return !!form.value.recipe_id;
  return form.value.title.trim().length > 0;
});

function setMode(next: 'recipe' | 'title') {
  mode.value = next;
}

const filteredRecipes = computed(() => {
  let recipes = allRecipes.value;

  // If searching, show all matching recipes regardless of library filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase().trim();
    const searchTerms = query.split(/\s+/).filter(Boolean);
    
    return recipes.filter(recipe => {
      const title = recipe.title.toLowerCase();
      // Handle tags correctly - they're objects with tag.label or tag.slug
      const tags = (recipe.tags || [])
        .map((t: any) => {
          const label = t.tag?.label || t.label || '';
          const slug = t.tag?.slug || t.slug || '';
          return `${label} ${slug}`.toLowerCase();
        })
        .filter(Boolean);
      
      const allText = [title, ...tags].join(' ');
      
      // All search terms must match either title or tags
      return searchTerms.every(term => allText.includes(term));
    });
  }

  // If library filter is active (and no search), filter by library
  if (selectedLibraryId.value) {
    recipes = recipes.filter(r => r.recipe_library_id === selectedLibraryId.value);
  }

  return recipes;
});

watch(() => props.defaultDate, (newDate) => {
  if (newDate) form.value.date = newDate;
});

watch(() => props.defaultSlot, (newSlot) => {
  if (newSlot) form.value.slot = newSlot;
});

watch(() => props.modelValue, async (isOpen) => {
  if (isOpen) {
    await loadLibraries();
    await loadAllRecipes();
  }
});

async function loadLibraries() {
  try {
    libraries.value = await $fetch('/api/recipe-libraries');
  } catch (error) {
    console.error('Failed to load libraries:', error);
  }
}

async function loadAllRecipes() {
  loadingRecipes.value = true;
  try {
    // Load all accessible recipes (no filter)
    allRecipes.value = await $fetch('/api/recipes');
  } catch (error) {
    console.error('Failed to load recipes:', error);
  } finally {
    loadingRecipes.value = false;
  }
}

let searchTimeout: NodeJS.Timeout | null = null;

async function onSearchChange() {
  // Just trigger the computed property to re-filter
  // No need to make API calls - we filter locally from allRecipes
}

function selectRecipe(recipe: Recipe) {
  form.value.recipe_id = recipe.id;
}

function getRecipeLibrary(libraryId: string) {
  return libraries.value.find(lib => lib.id === libraryId);
}

const handleSubmit = async () => {
  if (!canSubmit.value) return;

  const body: Record<string, unknown> = {
    meal_plan_id: props.mealPlanId,
    date: form.value.date,
    slot: form.value.slot,
  };
  if (mode.value === 'recipe') {
    body.recipe_id = form.value.recipe_id;
  } else {
    body.title = form.value.title.trim();
  }

  loading.value = true;
  try {
    await $fetch('/api/meal-plan', { method: 'POST', body });

    emit('success');
    emit('update:modelValue', false);

    // Reset form
    form.value = {
      date: props.defaultDate || toLocalDateKey(new Date()),
      slot: props.defaultSlot || 'DINNER',
      recipe_id: '',
      title: '',
    };
    mode.value = 'recipe';
    searchQuery.value = '';
    selectedLibraryId.value = '';
  } catch (error: any) {
    console.error('Failed to add meal:', error);
    alert(error?.data?.message || 'Failed to add meal');
  } finally {
    loading.value = false;
  }
};
</script>
