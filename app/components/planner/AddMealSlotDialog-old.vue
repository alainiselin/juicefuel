<template>
  <div
    v-if="modelValue"
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
    @click.self="$emit('update:modelValue', false)"
  >
    <div class="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
      <h2 class="text-xl font-bold text-gray-900 mb-4">Add Meal</h2>
      
      <form @submit.prevent="handleSubmit" class="space-y-4">
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
            <option value="SNACK">Snack</option>
            <option value="OTHER">Other</option>
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Recipe</label>
          <select
            v-model="form.recipe_id"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          >
            <option value="">Select a recipe...</option>
            <option
              v-for="recipe in recipes"
              :key="recipe.id"
              :value="recipe.id"
            >
              {{ recipe.title }}
            </option>
          </select>
        </div>

        <div class="flex gap-2 pt-2">
          <button
            type="submit"
            class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            :disabled="loading"
          >
            {{ loading ? 'Adding...' : 'Add Meal' }}
          </button>
          <button
            type="button"
            @click="$emit('update:modelValue', false)"
            class="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            :disabled="loading"
          >
            Cancel
          </button>
        </div>
      </form>
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
const form = ref({
  date: props.defaultDate || new Date().toISOString().split('T')[0],
  slot: props.defaultSlot || 'DINNER',
  recipe_id: '',
});

watch(() => props.defaultDate, (newDate) => {
  if (newDate) form.value.date = newDate;
});

watch(() => props.defaultSlot, (newSlot) => {
  if (newSlot) form.value.slot = newSlot;
});

const handleSubmit = async () => {
  if (!form.value.recipe_id) {
    alert('Please select a recipe');
    return;
  }

  loading.value = true;
  try {
    await $fetch('/api/meal-plan', {
      method: 'POST',
      body: {
        meal_plan_id: props.mealPlanId,
        date: form.value.date,
        slot: form.value.slot,
        recipe_id: form.value.recipe_id,
      },
    });

    emit('success');
    emit('update:modelValue', false);
    
    // Reset form
    form.value = {
      date: props.defaultDate || new Date().toISOString().split('T')[0],
      slot: props.defaultSlot || 'DINNER',
      recipe_id: '',
    };
  } catch (error: any) {
    console.error('Failed to add meal:', error);
    alert(error?.data?.message || 'Failed to add meal');
  } finally {
    loading.value = false;
  }
};
</script>
