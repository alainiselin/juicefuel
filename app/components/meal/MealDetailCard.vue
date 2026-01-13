<template>
  <div class="max-w-4xl mx-auto bg-white rounded-lg shadow-lg">
    <!-- Header -->
    <div class="border-b border-gray-200 p-6">
      <div class="flex items-start justify-between">
        <div class="flex-1">
          <h1 class="text-3xl font-bold text-gray-900 mb-2">
            {{ entry.recipe?.title || 'Untitled Recipe' }}
          </h1>
          <p v-if="entry.recipe?.description" class="text-gray-600 mb-3">
            {{ entry.recipe.description }}
          </p>
          <div class="flex items-center gap-3 text-sm text-gray-500">
            <span>{{ formatDate(entry.date) }} • {{ formatSlot(entry.slot) }}</span>
            <span v-if="entry.recipe?.prep_time_minutes" class="flex items-center gap-1">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {{ entry.recipe.prep_time_minutes }} min
            </span>
          </div>
        </div>
        
        <div class="flex gap-2">
          <button
            @click="$emit('favorite')"
            class="p-2 text-gray-400 hover:text-yellow-500 transition-colors"
            title="Favorite"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          </button>
          
          <button
            @click="$emit('delete')"
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
      <section v-if="entry.recipe?.tags && entry.recipe.tags.length > 0">
        <h2 class="text-xl font-semibold text-gray-900 mb-3">Tags</h2>
        <div class="flex flex-wrap gap-2">
          <span
            v-for="recipeTag in entry.recipe.tags"
            :key="recipeTag.tag.id"
            class="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
          >
            {{ recipeTag.tag.name }}
          </span>
        </div>
      </section>

      <!-- Instructions -->
      <section v-if="entry.recipe?.instructions_markdown">
        <h2 class="text-xl font-semibold text-gray-900 mb-3">Instructions</h2>
        <div class="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
          {{ entry.recipe.instructions_markdown }}
        </div>
      </section>

      <!-- Ingredients -->
      <section v-if="entry.recipe?.ingredients && entry.recipe.ingredients.length > 0">
        <h2 class="text-xl font-semibold text-gray-900 mb-3">Ingredients</h2>
        <ul class="space-y-2">
          <li
            v-for="(ingredient, idx) in entry.recipe.ingredients"
            :key="idx"
            class="flex items-start gap-3 text-gray-700"
          >
            <span class="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-xs text-blue-600 mt-0.5">
              {{ idx + 1 }}
            </span>
            <span class="flex-1">
              <span v-if="ingredient.quantity" class="font-medium">{{ ingredient.quantity }}</span>
              <span v-if="ingredient.unit" class="text-gray-600 ml-1">{{ formatUnit(ingredient.unit) }}</span>
              <span class="ml-2">{{ ingredient.ingredient.name }}</span>
              <span v-if="ingredient.note" class="text-sm text-gray-500 ml-2">({{ ingredient.note }})</span>
            </span>
          </li>
        </ul>
      </section>

      <!-- Source URL -->
      <section v-if="entry.recipe?.source_url">
        <h2 class="text-xl font-semibold text-gray-900 mb-3">Source</h2>
        <a
          :href="entry.recipe.source_url"
          target="_blank"
          rel="noopener noreferrer"
          class="text-blue-600 hover:underline"
        >
          {{ entry.recipe.source_url }}
        </a>
      </section>

      <!-- Empty States -->
      <div v-if="!entry.recipe?.instructions_markdown && (!entry.recipe?.ingredients || entry.recipe.ingredients.length === 0)" class="text-center py-8 text-gray-500">
        <p>No details available for this recipe.</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { MealPlanEntry, Unit } from '../../../spec/schemas';

const props = defineProps<{
  entry: MealPlanEntry;
}>();

defineEmits<{
  favorite: [];
  delete: [];
}>();

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatSlot = (slot: string) => {
  return slot.charAt(0) + slot.slice(1).toLowerCase();
};

const formatUnit = (unit: Unit) => {
  const unitMap: Record<Unit, string> = {
    G: 'g',
    KG: 'kg',
    ML: 'ml',
    L: 'L',
    TBSP: 'tbsp',
    TSP: 'tsp',
    CUP: 'cup',
    PIECE: 'piece',
    PACKAGE: 'package',
    OTHER: '',
  };
  return unitMap[unit] || unit;
};
</script>
