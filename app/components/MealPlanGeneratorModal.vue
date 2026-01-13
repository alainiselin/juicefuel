<template>
  <div
    v-if="modelValue"
    class="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50"
    @click.self="$emit('update:modelValue', false)"
  >
    <div
      class="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl"
    >
      <!-- Header -->
      <div class="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <h2 class="text-xl font-bold text-gray-900">Generate Meal Plan</h2>
        <button
          @click="$emit('update:modelValue', false)"
          class="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Content -->
      <div class="p-6 space-y-6">
        <!-- Days Slider -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Number of Days: {{ params.days }}
          </label>
          <input
            v-model.number="params.days"
            type="range"
            min="1"
            max="14"
            class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
          <div class="flex justify-between text-xs text-gray-500 mt-1">
            <span>1</span>
            <span>14</span>
          </div>
        </div>

        <!-- Meal Types -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Meal Types
          </label>
          <div class="flex gap-2">
            <button
              v-for="mealType in availableMealTypes"
              :key="mealType.value"
              @click="toggleMealType(mealType.value)"
              class="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              :class="params.mealTypes.includes(mealType.value)
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'"
            >
              {{ mealType.label }}
            </button>
          </div>
        </div>

        <!-- Diet -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Diet
          </label>
          <div class="flex gap-2">
            <button
              v-for="diet in diets"
              :key="diet.value"
              @click="params.diet = diet.value"
              class="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              :class="params.diet === diet.value
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'"
            >
              {{ diet.label }}
            </button>
          </div>
        </div>

        <!-- Favorites Mix -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Mix in Favorites: {{ params.favoriteRatio }}%
          </label>
          <input
            v-model.number="params.favoriteRatio"
            type="range"
            min="0"
            max="100"
            class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
          <div class="flex justify-between text-xs text-gray-500 mt-1">
            <span>0%</span>
            <span>100%</span>
          </div>
        </div>

        <!-- Advanced Filters Toggle -->
        <button
          @click="showAdvanced = !showAdvanced"
          class="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          <svg
            class="w-4 h-4 transition-transform"
            :class="{ 'rotate-90': showAdvanced }"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
          More Filters
        </button>

        <!-- Advanced Filters -->
        <div v-if="showAdvanced" class="space-y-4 pl-4 border-l-2 border-gray-200">
          <!-- Protein Filters -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Protein Filters
            </label>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="protein in proteins"
                :key="protein"
                @click="toggleProtein(protein)"
                class="px-3 py-1.5 rounded-lg text-sm transition-colors"
                :class="params.proteinFilters.includes(protein)
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'"
              >
                {{ protein.charAt(0).toUpperCase() + protein.slice(1) }}
              </button>
            </div>
          </div>

          <!-- Effort -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Effort
            </label>
            <div class="flex gap-2">
              <button
                v-for="effort in efforts"
                :key="effort.value"
                @click="params.effort = effort.value"
                class="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                :class="params.effort === effort.value
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'"
              >
                {{ effort.label }}
              </button>
            </div>
          </div>

          <!-- Recipe Libraries -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Recipe Libraries
            </label>
            <div v-if="loadingLibraries" class="text-sm text-gray-500">Loading libraries...</div>
            <div v-else-if="libraries.length === 0" class="text-sm text-gray-500">No libraries available</div>
            <div v-else class="space-y-2 max-h-40 overflow-y-auto">
              <label
                v-for="library in libraries"
                :key="library.id"
                class="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
              >
                <input
                  v-model="params.libraryIds"
                  :value="library.id"
                  type="checkbox"
                  class="w-4 h-4 text-blue-600 rounded"
                />
                <span class="text-sm text-gray-700">
                  {{ library.name }}
                  <span class="text-gray-500">({{ library.recipe_count }})</span>
                  <span v-if="library.is_public" class="text-xs">🌐</span>
                  <span v-if="!library.is_own_household" class="text-xs">📚</span>
                </span>
              </label>
            </div>
            <p class="text-xs text-gray-500 mt-1">
              Leave unchecked to include all libraries
            </p>
          </div>

          <!-- Variety Options -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Variety
            </label>
            <div class="space-y-2">
              <label class="flex items-center gap-2 cursor-pointer">
                <input
                  v-model="params.avoidSameRecipe"
                  type="checkbox"
                  class="w-4 h-4 text-blue-600 rounded"
                />
                <span class="text-sm text-gray-700">Avoid repeating the same recipe</span>
              </label>
              <label class="flex items-center gap-2 cursor-pointer">
                <input
                  v-model="params.avoidBackToBackCuisine"
                  type="checkbox"
                  class="w-4 h-4 text-blue-600 rounded"
                />
                <span class="text-sm text-gray-700">Avoid repeating cuisine back-to-back</span>
              </label>
              <label class="flex items-center gap-2 cursor-pointer">
                <input
                  v-model="params.avoidBackToBackProtein"
                  type="checkbox"
                  class="w-4 h-4 text-blue-600 rounded"
                />
                <span class="text-sm text-gray-700">Avoid repeating protein back-to-back</span>
              </label>
            </div>
          </div>
        </div>

        <!-- Relaxed Constraints Chips -->
        <div v-if="generatedResult && generatedResult.relaxedConstraints.length > 0" class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p class="text-sm font-medium text-yellow-800 mb-2">Constraints were relaxed:</p>
          <div class="flex flex-wrap gap-2">
            <span
              v-for="constraint in generatedResult.relaxedConstraints"
              :key="constraint"
              class="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full"
            >
              {{ constraint }}
            </span>
          </div>
        </div>

        <!-- Preview -->
        <div v-if="generatedResult" class="bg-gray-50 rounded-lg p-4">
          <h3 class="text-sm font-medium text-gray-900 mb-2">
            Preview ({{ generatedResult.suggestion.length }} meals)
          </h3>
          <p class="text-xs text-gray-600">
            This plan will only fill empty slots in your planner
          </p>
        </div>
      </div>

      <!-- Footer Actions -->
      <div class="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex gap-3">
        <button
          v-if="!generatedResult"
          @click="generate"
          :disabled="loading || params.mealTypes.length === 0"
          class="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2 transition-colors"
        >
          <svg v-if="loading" class="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          Roll the Dice
        </button>
        <template v-else>
          <button
            @click="reroll"
            :disabled="loading"
            class="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium transition-colors"
          >
            Reroll
          </button>
          <button
            @click="apply"
            :disabled="loading"
            class="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium transition-colors"
          >
            Apply to Planner
          </button>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { SlotType } from '../../spec/schemas';

interface Props {
  modelValue: boolean;
  mealPlanId: string;
  startDate: Date;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  'success': [];
}>();

const showAdvanced = ref(false);
const loading = ref(false);
const loadingLibraries = ref(false);
const generatedResult = ref<any>(null);
const libraries = ref<any[]>([]);

const params = ref({
  days: 7,
  mealTypes: ['BREAKFAST', 'LUNCH', 'DINNER'] as SlotType[],
  diet: 'none' as 'none' | 'vegetarian' | 'vegan',
  favoriteRatio: 30,
  proteinFilters: [] as string[],
  effort: 'any' as 'any' | 'quick' | 'normal' | 'project',
  libraryIds: [] as string[],
  avoidSameRecipe: true,
  avoidBackToBackCuisine: false,
  avoidBackToBackProtein: false,
  seed: Date.now(),
});

const availableMealTypes = [
  { value: 'BREAKFAST' as SlotType, label: 'Breakfast' },
  { value: 'LUNCH' as SlotType, label: 'Lunch' },
  { value: 'DINNER' as SlotType, label: 'Dinner' },
];

const diets = [
  { value: 'none', label: 'None' },
  { value: 'vegetarian', label: 'Vegetarian' },
  { value: 'vegan', label: 'Vegan' },
];

const proteins = ['poultry', 'beef', 'fish', 'pork', 'game'];

const efforts = [
  { value: 'any', label: 'Any' },
  { value: 'quick', label: 'Quick' },
  { value: 'normal', label: 'Normal' },
  { value: 'project', label: 'Project' },
];

const toggleMealType = (mealType: SlotType) => {
  const index = params.value.mealTypes.indexOf(mealType);
  if (index > -1) {
    if (params.value.mealTypes.length > 1) {
      params.value.mealTypes.splice(index, 1);
    }
  } else {
    params.value.mealTypes.push(mealType);
  }
};

const toggleProtein = (protein: string) => {
  const index = params.value.proteinFilters.indexOf(protein);
  if (index > -1) {
    params.value.proteinFilters.splice(index, 1);
  } else {
    params.value.proteinFilters.push(protein);
  }
};

const loadLibraries = async () => {
  loadingLibraries.value = true;
  try {
    libraries.value = await $fetch('/api/recipe-libraries');
  } catch (error) {
    console.error('Failed to load libraries:', error);
    libraries.value = [];
  } finally {
    loadingLibraries.value = false;
  }
};

const generate = async () => {
  loading.value = true;
  try {
    const result = await $fetch('/api/meal-plan/generate', {
      method: 'POST',
      body: params.value,
    });
    
    // Adjust dates to start from the planner's current start date
    const start = new Date(props.startDate);
    result.suggestion = result.suggestion.map((slot: any, index: number) => {
      const mealsPerDay = params.value.mealTypes.length;
      const dayOffset = Math.floor(index / mealsPerDay);
      const date = new Date(start);
      date.setDate(date.getDate() + dayOffset);
      return {
        ...slot,
        date: date.toISOString().split('T')[0],
      };
    });
    
    generatedResult.value = result;
  } catch (error: any) {
    alert(error.data?.message || 'Failed to generate meal plan');
  } finally {
    loading.value = false;
  }
};

const reroll = () => {
  params.value.seed = Date.now();
  generatedResult.value = null;
  generate();
};

const apply = async () => {
  if (!generatedResult.value) return;
  
  loading.value = true;
  try {
    await $fetch('/api/meal-plan/apply', {
      method: 'POST',
      body: {
        mealPlanId: props.mealPlanId,
        slots: generatedResult.value.suggestion,
      },
    });
    
    emit('success');
    emit('update:modelValue', false);
    generatedResult.value = null;
  } catch (error: any) {
    alert(error.data?.message || 'Failed to apply meal plan');
  } finally {
    loading.value = false;
  }
};

// Reset when modal opens/closes
watch(() => props.modelValue, (newVal) => {
  if (newVal) {
    loadLibraries();
  } else {
    generatedResult.value = null;
    params.value.seed = Date.now();
  }
});
</script>
