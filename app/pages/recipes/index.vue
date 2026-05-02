<template>
  <DesktopShell>
    <div class="p-8">
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-3xl font-bold text-gray-900">Recipes</h1>
        <div class="flex gap-3">
          <button
            @click="showLibraryModal = true"
            class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Manage Libraries
          </button>
          <button
            @click="showAIGenerateModal = true"
            :disabled="!selectedLibrary || !selectedLibrary.is_own_household"
            class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            title="Generate recipe with AI"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Generate with AI
          </button>
          <button
            @click="showCreateRecipeModal = true"
            :disabled="!selectedLibrary"
            class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Create Recipe
          </button>
        </div>
      </div>

      <!-- Library Selector & Search -->
      <div class="flex gap-4 mb-6">
        <select
          v-model="selectedLibraryId"
          class="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Libraries</option>
          <option
            v-for="lib in libraries"
            :key="lib.id"
            :value="lib.id"
          >
            {{ lib.name }} ({{ lib.recipe_count }})
            {{ lib.is_public ? '🌐' : '' }}
            {{ !lib.is_own_household ? '📚' : '' }}
          </option>
        </select>

        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search by title or tags (e.g. 'pasta italian')..."
          class="flex-1 max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          @input="onSearch"
        />
      </div>
      
      <p v-if="searchQuery" class="text-xs text-gray-500 mb-4">
        Search works across recipe titles and tags
      </p>

      <!-- Loading State -->
      <div v-if="loadingRecipes" class="text-center py-8">
        <p class="text-gray-600">Loading recipes...</p>
      </div>

      <!-- Recipe Grid -->
      <div v-else-if="filteredRecipes.length > 0" class="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-9 gap-2">
        <div
          v-for="recipe in filteredRecipes"
          :key="recipe.id"
          class="bg-white rounded-lg shadow cursor-pointer hover:shadow-lg transition-shadow aspect-square flex flex-col p-2"
          @click="navigateToRecipe(recipe.id)"
        >
          <h3 class="text-sm font-semibold text-gray-800 mb-1 line-clamp-2 flex-grow">{{ recipe.title }}</h3>
          <div class="mt-auto">
            <p class="text-xs text-gray-600 mb-1">
              {{ recipe.ingredients.length }} ingredients
            </p>
            <div class="flex gap-2">
              <button
                @click.stop="deleteRecipe(recipe.id)"
                class="text-red-600 text-xs hover:underline"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="text-center py-16">
        <svg class="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
        <p class="text-gray-600 mb-4">
          {{ selectedLibrary ? `No recipes in ${selectedLibrary.name}` : 'No recipes found' }}
        </p>
        <button
          v-if="selectedLibrary && selectedLibrary.is_own_household"
          @click="showCreateRecipeModal = true"
          class="text-blue-600 hover:underline"
        >
          Create your first recipe
        </button>
      </div>

      <!-- Library Management Modal -->
      <div
        v-if="showLibraryModal"
        class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
        @click.self="showLibraryModal = false"
      >
        <div class="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
          <h2 class="text-xl font-bold mb-4">Recipe Libraries</h2>
          
          <!-- Create New Library -->
          <div class="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 class="text-sm font-medium text-gray-700 mb-3">Create New Library</h3>
            <div class="flex gap-2">
              <input
                v-model="newLibraryName"
                type="text"
                placeholder="Library name..."
                class="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                @keypress.enter="createLibrary"
              />
              <label class="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg bg-white">
                <input
                  v-model="newLibraryPublic"
                  type="checkbox"
                  class="rounded"
                />
                <span class="text-sm">Public</span>
              </label>
              <button
                @click="createLibrary"
                :disabled="!newLibraryName || creatingLibrary"
                class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Create
              </button>
            </div>
          </div>

          <!-- Libraries List -->
          <div class="space-y-2">
            <div
              v-for="lib in libraries"
              :key="lib.id"
              class="p-4 border border-gray-200 rounded-lg"
            >
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <div class="flex items-center gap-2">
                    <h3 class="font-semibold text-gray-900">{{ lib.name }}</h3>
                    <span
                      v-if="lib.is_public"
                      class="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full"
                    >
                      Public
                    </span>
                    <span
                      v-if="!lib.is_own_household"
                      class="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full"
                    >
                      Shared
                    </span>
                  </div>
                  <p class="text-sm text-gray-600 mt-1">
                    {{ lib.recipe_count }} recipes
                    <span v-if="lib.created_by">· by {{ lib.created_by.display_name }}</span>
                  </p>
                </div>
                
                <div v-if="lib.is_own_household" class="flex gap-2">
                  <button
                    @click="toggleLibraryPrivacy(lib)"
                    class="text-sm text-blue-600 hover:underline"
                  >
                    Make {{ lib.is_public ? 'Private' : 'Public' }}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div class="flex justify-end mt-6">
            <button
              @click="showLibraryModal = false"
              class="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      <!-- Create Recipe Modal -->
      <div
        v-if="showCreateRecipeModal"
        class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
        @click.self="closeCreateModal"
      >
        <div class="bg-white rounded-lg p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
          <h2 class="text-xl font-bold mb-4">Create Recipe</h2>
          
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                v-model="newRecipe.title"
                type="text"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Recipe name..."
                required
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                v-model="newRecipe.description"
                maxlength="240"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                rows="2"
                placeholder="A short, enticing description of this recipe..."
              ></textarea>
              <p class="text-xs text-gray-500 mt-1">
                {{ newRecipe.description?.length || 0 }}/240
              </p>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Library</label>
              <select
                v-model="newRecipe.recipe_library_id"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              >
                <option
                  v-for="lib in ownLibraries"
                  :key="lib.id"
                  :value="lib.id"
                >
                  {{ lib.name }}
                </option>
              </select>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Source URL</label>
              <input
                v-model="newRecipe.source_url"
                type="url"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="https://..."
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Instructions</label>
              <textarea
                v-model="newRecipe.instructions_markdown"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                rows="6"
                placeholder="## Preparation&#10;&#10;1. First step...&#10;2. Second step..."
              ></textarea>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Tags</label>
              <TagInput
                v-model="newRecipeTags"
                :household-id="createModalHouseholdId"
                placeholder="Add tags (cuisine, diet, flavor...)"
              />
            </div>
          </div>

          <!-- Ingredients section - always visible -->
          <div class="mt-6 space-y-4">
            <div class="border-t pt-4">
              <h3 class="text-lg font-semibold text-gray-900 mb-4">Ingredients</h3>
              
              <DraftAddIngredientSearch @added="onDraftIngredientAdded" />
              
              <div v-if="draftIngredients.length > 0" class="mt-4">
                <h4 class="text-sm font-medium text-gray-700 mb-2">
                  Ingredients ({{ draftIngredients.length }})
                </h4>
                <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
                  <DraftIngredientCard
                    v-for="(ingredient, index) in draftIngredients"
                    :key="index"
                    :ingredient="ingredient"
                    @remove="removeDraftIngredient(index)"
                  />
                </div>
              </div>
            </div>
          </div>

          <div class="flex gap-2 mt-6">
            <button
              @click="createRecipe"
              :disabled="!newRecipe.title || !newRecipe.recipe_library_id"
              class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              Create Recipe
            </button>
            <button
              @click="closeCreateModal"
              class="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      <!-- AI Generate Recipe Modal -->
      <div
        v-if="showAIGenerateModal"
        class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
        @click.self="closeAIModal"
      >
        <div class="bg-white rounded-lg p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
          <h2 class="text-xl font-bold mb-4">Generate Recipe with AI</h2>
          
          <!-- Input Form -->
          <div v-if="!aiDraft" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">What would you like to make?</label>
              <input
                v-model="aiQuery"
                type="text"
                placeholder="e.g., authentic pho, quick chicken stir fry..."
                class="w-full px-3 py-2 border border-gray-300 rounded-lg"
                @keypress.enter="generateAIRecipe"
              />
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Servings</label>
                <select v-model="aiServings" class="w-full px-3 py-2 border border-gray-300 rounded-lg">
                  <option :value="null">Auto</option>
                  <option :value="2">2 servings</option>
                  <option :value="4">4 servings</option>
                  <option :value="6">6 servings</option>
                  <option :value="8">8 servings</option>
                </select>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Max Time (minutes)</label>
                <input
                  v-model.number="aiMaxTime"
                  type="number"
                  placeholder="Optional"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>

            <div v-if="aiError" class="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {{ aiError }}
            </div>

            <div class="flex gap-2">
              <button
                @click="generateAIRecipe"
                :disabled="!aiQuery || aiGenerating"
                class="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <svg v-if="aiGenerating" class="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>{{ aiGenerating ? 'Generating...' : 'Generate Recipe' }}</span>
              </button>
              <button
                @click="closeAIModal"
                class="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>

          <!-- Preview Draft -->
          <div v-else class="space-y-4">
            <div class="p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <h3 class="text-lg font-semibold text-gray-900">{{ aiDraft.title }}</h3>
              <p class="text-sm text-gray-600 mt-1">{{ aiDraft.description }}</p>
              <div class="flex gap-4 mt-2 text-xs text-gray-500">
                <span>{{ aiDraft.servings }} servings</span>
                <span>{{ aiDraft.times.total_min }} min total</span>
                <span>{{ aiDraft.ingredients.length }} ingredients</span>
              </div>
            </div>

            <div>
              <h4 class="font-semibold text-gray-900 mb-2">Ingredients</h4>
              <ul class="space-y-1 text-sm">
                <li v-for="(ing, idx) in aiDraft.ingredients" :key="idx" class="text-gray-700">
                  {{ ing.amount }} {{ ing.unit }} {{ ing.name }}
                  <span v-if="ing.note" class="text-gray-500 italic">({{ ing.note }})</span>
                </li>
              </ul>
            </div>

            <div>
              <h4 class="font-semibold text-gray-900 mb-2">Steps</h4>
              <ol class="space-y-2 text-sm list-decimal list-inside">
                <li v-for="step in aiDraft.steps" :key="step.order" class="text-gray-700">
                  {{ step.text }}
                </li>
              </ol>
            </div>

            <div v-if="aiCost" class="text-xs text-gray-500">
              Generated with {{ aiMeta?.model }} · Cost: ~${{ aiCost.toFixed(4) }}
            </div>

            <div class="flex gap-2 pt-4 border-t">
              <button
                @click="saveAIRecipe"
                :disabled="aiSaving"
                class="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {{ aiSaving ? 'Saving...' : 'Save Recipe' }}
              </button>
              <button
                @click="regenerateAIRecipe"
                :disabled="aiGenerating"
                class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                Regenerate
              </button>
              <button
                @click="closeAIModal"
                class="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </DesktopShell>
</template>

<script setup lang="ts">
import { useRecipesStore } from '~/stores/recipes';
import { useAIRecipeGenerator } from '~/composables/useAIRecipeGenerator';

const store = useRecipesStore();
const router = useRouter();

const libraries = ref<any[]>([]);
const selectedLibraryId = ref('');
const searchQuery = ref('');
const loadingRecipes = ref(false);

const showLibraryModal = ref(false);
const showCreateRecipeModal = ref(false);
const showAIGenerateModal = ref(false);

const newLibraryName = ref('');
const newLibraryPublic = ref(false);
const creatingLibrary = ref(false);

const newRecipe = ref({
  title: '',
  description: '',
  recipe_library_id: '',
  source_url: '',
  instructions_markdown: '',
});

const newRecipeTags = ref<any[]>([]);
const draftIngredients = ref<Array<{
  ingredient_id: string;
  ingredient_name: string;
  quantity: number | null;
  unit: string | null;
  note: string | null;
}>>([]);
const createdRecipeId = ref<string | null>(null);

const createModalHouseholdId = computed(() => {
  if (!newRecipe.value.recipe_library_id) {
    return '';
  }
  const lib = libraries.value.find(l => l.id === newRecipe.value.recipe_library_id);
  return lib?.household_id || '';
});

// AI Generation
const aiGenerator = useAIRecipeGenerator();
const aiQuery = ref('');
const aiServings = ref<number | null>(null);
const aiMaxTime = ref<number | null>(null);
const aiDraft = ref<any>(null);
const aiMeta = ref<any>(null);
const aiGenerating = computed(() => aiGenerator.generating.value);
const aiSaving = computed(() => aiGenerator.saving.value);
const aiError = computed(() => aiGenerator.error.value);
const aiCost = computed(() => aiMeta.value?.estimated_cost_usd);

const selectedLibrary = computed(() => {
  return libraries.value.find(lib => lib.id === selectedLibraryId.value);
});

const ownLibraries = computed(() => {
  return libraries.value.filter(lib => lib.is_own_household);
});

const filteredRecipes = computed(() => {
  let recipes = store.recipes;
  
  // Filter by library if selected
  if (selectedLibraryId.value) {
    recipes = recipes.filter(r => r.recipe_library_id === selectedLibraryId.value);
  }
  
  // Filter by search query (title + tags)
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase().trim();
    const searchTerms = query.split(/\s+/).filter(Boolean);
    
    recipes = recipes.filter(recipe => {
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
  
  return recipes;
});

async function loadLibraries() {
  try {
    libraries.value = await $fetch('/api/recipe-libraries');
    
    // Pre-select first own library
    if (libraries.value.length > 0) {
      const firstOwn = libraries.value.find(l => l.is_own_household);
      if (firstOwn) {
        selectedLibraryId.value = firstOwn.id;
      }
    }
  } catch (error) {
    console.error('Failed to load libraries:', error);
  }
}

async function loadRecipes(options?: { silent?: boolean }) {
  // SWR: silent calls leave the spinner alone so cached recipes stay visible.
  if (!options?.silent) loadingRecipes.value = true;
  try {
    await store.fetchRecipes(searchQuery.value, selectedLibraryId.value, options);
  } finally {
    if (!options?.silent) loadingRecipes.value = false;
  }
}

async function createLibrary() {
  if (!newLibraryName.value || creatingLibrary.value) return;
  
  try {
    creatingLibrary.value = true;
    const library = await $fetch('/api/recipe-libraries', {
      method: 'POST',
      body: {
        name: newLibraryName.value,
        is_public: newLibraryPublic.value,
      },
    });
    
    libraries.value.unshift(library);
    newLibraryName.value = '';
    newLibraryPublic.value = false;
  } catch (error: any) {
    alert(error.data?.message || 'Failed to create library');
  } finally {
    creatingLibrary.value = false;
  }
}

async function toggleLibraryPrivacy(lib: any) {
  try {
    await $fetch(`/api/recipe-libraries/${lib.id}`, {
      method: 'PATCH',
      body: {
        is_public: !lib.is_public,
      },
    });
    
    lib.is_public = !lib.is_public;
  } catch (error: any) {
    alert(error.data?.message || 'Failed to update library');
  }
}

const onSearch = () => {
  // Search is now handled client-side in filteredRecipes computed
  // No need to make API calls
};

// onMounted controls the very first fetch (so it can run silently with cached data).
// The watch only fires for *user-driven* library changes after that point.
let suppressLibraryWatch = true;
watch(selectedLibraryId, () => {
  if (suppressLibraryWatch) return;
  loadRecipes();
});

// Set default library to "My Recipes" when modal opens
watch(showCreateRecipeModal, (isOpen) => {
  if (isOpen && !newRecipe.value.recipe_library_id) {
    const myRecipesLib = ownLibraries.value.find(lib => lib.name === 'My Recipes');
    if (myRecipesLib) {
      newRecipe.value.recipe_library_id = myRecipesLib.id;
    } else if (ownLibraries.value.length > 0) {
      newRecipe.value.recipe_library_id = ownLibraries.value[0].id;
    }
  }
});

const createRecipe = async () => {
  if (!newRecipe.value.title || !newRecipe.value.recipe_library_id) {
    alert('Title and Library are required');
    return;
  }

  // Create the recipe
  const createdRecipe = await store.createRecipe({
    title: newRecipe.value.title,
    description: newRecipe.value.description || undefined,
    recipe_library_id: newRecipe.value.recipe_library_id,
    source_url: newRecipe.value.source_url || undefined,
    instructions_markdown: newRecipe.value.instructions_markdown || undefined,
    ingredients: [],
  });

  if (!createdRecipe) {
    alert('Failed to create recipe');
    return;
  }

  createdRecipeId.value = createdRecipe.id;

  // Add tags if any
  if (newRecipeTags.value.length > 0) {
    for (const tag of newRecipeTags.value) {
      try {
        await $fetch(`/api/recipes/${createdRecipe.id}/tags`, {
          method: 'POST',
          body: { tag_id: tag.id }
        });
      } catch (err) {
        console.error('Failed to add tag:', err);
      }
    }
  }

  // Add draft ingredients if any
  if (draftIngredients.value.length > 0) {
    for (const ingredient of draftIngredients.value) {
      // Skip invalid ingredients
      if (!ingredient.quantity || ingredient.quantity <= 0 || !ingredient.unit) {
        console.warn('Skipping invalid ingredient:', ingredient);
        continue;
      }

      try {
        const payload: any = {
          ingredient_id: ingredient.ingredient_id,
          quantity: ingredient.quantity,
          unit: ingredient.unit,
        };
        
        // Only include note if it's not null/empty
        if (ingredient.note) {
          payload.note = ingredient.note;
        }

        await $fetch(`/api/recipes/${createdRecipe.id}/ingredients`, {
          method: 'POST',
          body: payload,
        });
      } catch (err: any) {
        console.error('Failed to add ingredient:', ingredient);
        console.error('Error details:', err?.data || err);
      }
    }
  }

  // Navigate to recipe detail page
  closeCreateModal();
  router.push(`/recipes/${createdRecipe.id}`);
};

const onDraftIngredientAdded = (ingredient: { ingredient_id: string; ingredient_name: string; quantity: number | null; unit: string | null; note: string | null }) => {
  draftIngredients.value.push(ingredient);
};

const removeDraftIngredient = (index: number) => {
  draftIngredients.value.splice(index, 1);
};

const closeCreateModal = () => {
  showCreateRecipeModal.value = false;
  newRecipe.value = {
    title: '',
    description: '',
    recipe_library_id: '',
    source_url: '',
    instructions_markdown: '',
  };
  newRecipeTags.value = [];
  draftIngredients.value = [];
  createdRecipeId.value = null;
  loadRecipes();
};

const deleteRecipe = async (id: string) => {
  if (confirm('Are you sure you want to delete this recipe?')) {
    await store.deleteRecipe(id);
    await loadRecipes();
  }
};

const navigateToRecipe = (id: string) => {
  router.push(`/recipes/${id}`);
};

// AI Generation Functions
async function generateAIRecipe() {
  if (!aiQuery.value || !selectedLibrary.value) return;

  aiGenerator.clearError();
  
  try {
    const response = await $fetch('/api/households/me');
    const householdId = response?.household?.id;
    
    console.log('[AI Generate] Household response:', response);
    console.log('[AI Generate] Household ID:', householdId);
    
    if (!householdId) {
      alert('No active household found');
      return;
    }

    const result = await aiGenerator.generate({
      household_id: householdId,
      query: aiQuery.value,
      servings: aiServings.value,
      constraints: aiMaxTime.value ? { max_total_minutes: aiMaxTime.value } : undefined,
    });

    if (result) {
      aiDraft.value = result.draft;
      aiMeta.value = result.meta;
    }
  } catch (error: any) {
    console.error('Failed to get household:', error);
    alert(error?.data?.message || 'Failed to get active household');
  }
}

async function regenerateAIRecipe() {
  aiDraft.value = null;
  aiMeta.value = null;
  await generateAIRecipe();
}

async function saveAIRecipe() {
  if (!aiDraft.value || !selectedLibrary.value) return;

  try {
    const response = await $fetch('/api/households/me');
    const householdId = response?.household?.id;

    if (!householdId) {
      alert('No active household found');
      return;
    }

    const recipe = await aiGenerator.save({
      household_id: householdId,
      recipe_library_id: selectedLibrary.value.id,
      draft: aiDraft.value,
    });

    if (recipe) {
      closeAIModal();
      await loadRecipes();
      router.push(`/recipes/${recipe.id}`);
    }
  } catch (error: any) {
    console.error('Failed to save recipe:', error);
    alert(error?.data?.message || 'Failed to save AI-generated recipe');
  }
}

function closeAIModal() {
  showAIGenerateModal.value = false;
  aiQuery.value = '';
  aiServings.value = null;
  aiMaxTime.value = null;
  aiDraft.value = null;
  aiMeta.value = null;
  aiGenerator.clearError();
}

// SWR: render cached recipes immediately on revisit and refresh in the background.
onMounted(() => {
  const hasCachedRecipes = store.recipes.length > 0;
  if (!hasCachedRecipes) loadingRecipes.value = true;

  void (async () => {
    try {
      await loadLibraries();  // sets selectedLibraryId; library watch is suppressed for now
      await loadRecipes({ silent: hasCachedRecipes });
    } finally {
      // Re-enable the watch so subsequent user-driven library changes refresh normally.
      suppressLibraryWatch = false;
      if (!hasCachedRecipes) loadingRecipes.value = false;
    }
  })();
});
</script>
