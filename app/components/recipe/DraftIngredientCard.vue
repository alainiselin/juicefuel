<template>
  <div class="bg-white border border-gray-200 rounded-lg p-2 hover:border-blue-300 transition-colors relative group aspect-square flex flex-col">
    <!-- Remove Button -->
    <button
      @click="$emit('remove')"
      class="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-50 text-red-600 hover:bg-red-100 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
      title="Remove ingredient"
    >
      <svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>

    <!-- Ingredient Name -->
    <div class="font-semibold text-gray-900 mb-1 pr-5 text-xs leading-tight">
      {{ ingredient.ingredient_name }}
    </div>

    <!-- Quantity & Unit (Display Only) -->
    <div class="flex items-baseline gap-1 mb-0.5">
      <div class="text-lg font-bold text-blue-600">
        {{ formatQuantity(ingredient.quantity) }}
      </div>
      <div class="text-xs text-gray-700">
        {{ formatUnit(ingredient.unit) }}
      </div>
    </div>

    <!-- Note (Display Only) -->
    <div v-if="ingredient.note" class="mt-auto">
      <div class="text-[10px] text-gray-600 italic truncate block w-full text-left">
        {{ ingredient.note }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  ingredient: {
    ingredient_id: string;
    ingredient_name: string;
    quantity: number | null;
    unit: string | null;
    note: string | null;
  };
}>();

defineEmits<{
  remove: [];
}>();

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
    OTHER: '',
  };
  return unitMap[unit] || unit.toLowerCase();
}

function formatQuantity(qty: number | null): string {
  if (qty === null || qty === undefined) return '';
  const num = typeof qty === 'number' ? qty : Number(qty);
  if (isNaN(num)) return '';
  if (num % 1 === 0) return num.toString();
  return num.toFixed(2).replace(/\.?0+$/, '');
}
</script>
