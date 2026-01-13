<template>
  <DesktopShell>
    <div class="p-8 max-w-6xl mx-auto">
      <div class="mb-6">
        <h1 class="text-3xl font-bold text-gray-900 mb-2">Edit Recipe</h1>
        <button
          @click="goBack"
          class="text-blue-600 hover:text-blue-700 text-sm"
        >
          ← Back to recipe
        </button>
      </div>

      <div v-if="loading" class="text-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p class="text-gray-600 mt-4">Loading recipe...</p>
      </div>

      <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-4">
        <p class="text-red-800">{{ error }}</p>
      </div>

      <div v-else-if="recipe" class="space-y-6">
        <!-- Basic Info -->
        <div class="bg-white rounded-lg border border-gray-200 p-6">
          <h2 class="text-xl font-semibold text-gray-900 mb-4">Basic Information</h2>
          
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Recipe Title</label>
              <input
                v-model="recipe.title"
                @input="debouncedSave"
                type="text"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Description (optional, max 240 characters)
              </label>
              <textarea
                v-model="recipe.description"
                @input="debouncedSave"
                maxlength="240"
                rows="2"
                placeholder="A short, enticing description of this recipe..."
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              ></textarea>
              <p class="text-xs text-gray-500 mt-1">
                {{ recipe.description?.length || 0 }}/240
              </p>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Source URL (optional)</label>
              <input
                v-model="recipe.source_url"
                @input="debouncedSave"
                type="url"
                placeholder="https://..."
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Preparation Time (minutes)</label>
              <input
                v-model.number="recipe.prep_time_minutes"
                @input="debouncedSave"
                type="number"
                min="0"
                placeholder="e.g., 30"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Instructions (Markdown)</label>
              <textarea
                v-model="recipe.instructions_markdown"
                @input="debouncedSave"
                rows="8"
                placeholder="## Preparation\n\n1. First step...\n2. Second step..."
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
              ></textarea>
            </div>
          </div>
        </div>

        <!-- Tags -->
        <div class="bg-white rounded-lg border border-gray-200 p-6">
          <h2 class="text-xl font-semibold text-gray-900 mb-4">Tags</h2>
          <TagInput
            v-model="recipeTags"
            :household-id="householdId"
            placeholder="Add tags (cuisine, diet, flavor...)"
            @tag-added="attachTag"
            @tag-removed="detachTag"
          />
        </div>

        <!-- Servings Control -->
        <ServingsControl
          :base-servings="recipe.base_servings"
          :current-servings="currentServings"
          @update:base-servings="updateBaseServings"
          @update:current-servings="currentServings = $event"
        />

        <!-- Add Ingredient -->
        <AddIngredientSearch
          :recipe-id="recipe.id"
          @added="onIngredientAdded"
        />

        <!-- Ingredients List -->
        <div class="bg-white rounded-lg border border-gray-200 p-6">
          <h2 class="text-xl font-semibold text-gray-900 mb-4">
            Ingredients
            <span class="text-sm text-gray-500 font-normal">({{ recipe.ingredients.length }})</span>
          </h2>

          <div v-if="recipe.ingredients.length === 0" class="text-center py-12">
            <svg class="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <p class="text-gray-600">No ingredients yet</p>
            <p class="text-sm text-gray-500">Add ingredients using the search above</p>
          </div>

          <div v-else class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
            <IngredientCard
              v-for="ingredient in recipe.ingredients"
              :key="ingredient.ingredient_id"
              :ingredient="ingredient"
              :recipe-id="recipe.id"
              :base-servings="recipe.base_servings"
              :current-servings="currentServings"
              @updated="onIngredientUpdated"
              @remove="removeIngredient(ingredient)"
            />
          </div>
        </div>

        <!-- Save Status -->
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <div v-if="saving" class="flex items-center gap-2 text-gray-600">
              <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span class="text-sm">Saving...</span>
            </div>
            <div v-else-if="saved" class="flex items-center gap-2 text-green-600">
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
              </svg>
              <span class="text-sm">Saved</span>
            </div>
          </div>

          <button
            @click="goBack"
            class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Done Editing
          </button>
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
const saving = ref(false);
const saved = ref(false);
const currentServings = ref(4);
const recipeTags = ref<Array<{ id: string; name: string; kind?: string | null }>>([]);
const householdId = ref('');

let saveTimeout: NodeJS.Timeout | null = null;
let savedTimeout: NodeJS.Timeout | null = null;

async function loadRecipe() {
  loading.value = true;
  try {
    recipe.value = await $fetch(`/api/recipes/${recipeId}`);
    currentServings.value = recipe.value.base_servings;
    // Flatten tags structure: { tag: { id, name } } -> { id, name }
    recipeTags.value = (recipe.value.tags || []).map((t: any) => ({
      id: t.tag.id,
      name: t.tag.name,
      kind: t.tag.kind,
    }));
    householdId.value = recipe.value.recipe_library.household_id;
  } catch (err: any) {
    error.value = err.data?.message || 'Failed to load recipe';
  } finally {
    loading.value = false;
  }
}

async function attachTag(tagId: string) {
  try {
    await $fetch(`/api/recipes/${recipeId}/tags`, {
      method: 'POST',
      body: { tag_id: tagId },
    });
  } catch (err) {
    console.error('Failed to attach tag:', err);
    // Rollback in UI
    recipeTags.value = recipeTags.value.filter(t => t.id !== tagId);
  }
}

async function detachTag(tagId: string) {
  try {
    await $fetch(`/api/recipes/${recipeId}/tags/${tagId}`, {
      method: 'DELETE',
    });
  } catch (err) {
    console.error('Failed to detach tag:', err);
  }
}

async function saveRecipe() {
  if (!recipe.value) return;
  
  saving.value = true;
  saved.value = false;
  
  try {
    await $fetch(`/api/recipes/${recipeId}`, {
      method: 'PATCH',
      body: {
        title: recipe.value.title,
        base_servings: recipe.value.base_servings,
        source_url: recipe.value.source_url || null,
        instructions_markdown: recipe.value.instructions_markdown || null,
        prep_time_minutes: recipe.value.prep_time_minutes && recipe.value.prep_time_minutes > 0 ? recipe.value.prep_time_minutes : null,
      },
    });
    
    saved.value = true;
    if (savedTimeout) clearTimeout(savedTimeout);
    savedTimeout = setTimeout(() => {
      saved.value = false;
    }, 3000);
  } catch (err: any) {
    console.error('Failed to save recipe:', err);
    alert(err.data?.message || 'Failed to save recipe');
  } finally {
    saving.value = false;
  }
}

function debouncedSave() {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    saveRecipe();
  }, 2000);
}

function updateBaseServings(newServings: number) {
  if (!recipe.value) return;
  recipe.value.base_servings = newServings;
  debouncedSave();
}

function onIngredientAdded(ingredient: any) {
  if (!recipe.value) return;
  recipe.value.ingredients.push(ingredient);
}

function onIngredientUpdated(updated: any) {
  if (!recipe.value) return;
  const index = recipe.value.ingredients.findIndex(
    (i: any) => i.ingredient_id === updated.ingredient_id
  );
  if (index !== -1) {
    recipe.value.ingredients[index] = updated;
  }
}

async function removeIngredient(ingredient: any) {
  if (!confirm('Remove this ingredient?')) return;
  
  try {
    const recipeIngredientId = `${ingredient.recipe_id}-${ingredient.ingredient_id}`;
    await $fetch(`/api/recipes/${recipeId}/ingredients/${recipeIngredientId}`, {
      method: 'DELETE',
    });
    
    if (recipe.value) {
      recipe.value.ingredients = recipe.value.ingredients.filter(
        (i: any) => i.ingredient_id !== ingredient.ingredient_id
      );
    }
  } catch (err: any) {
    console.error('Failed to remove ingredient:', err);
    alert(err.data?.message || 'Failed to remove ingredient');
  }
}

function goBack() {
  router.push(`/recipes/${recipeId}`);
}

onMounted(() => {
  loadRecipe();
});

onBeforeUnmount(() => {
  if (saveTimeout) clearTimeout(saveTimeout);
  if (savedTimeout) clearTimeout(savedTimeout);
});
</script>
