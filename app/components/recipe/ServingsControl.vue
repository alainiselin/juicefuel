<template>
  <div class="bg-gray-50 p-4 rounded-lg border border-gray-200">
    <div class="grid grid-cols-2 gap-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">
          Base Servings
        </label>
        <input
          :value="baseServings"
          @input="$emit('update:baseServings', parseInt(($event.target as HTMLInputElement).value) || 1)"
          type="number"
          min="1"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <p class="text-xs text-gray-500 mt-1">Recipe base amount</p>
      </div>
      
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">
          Current Servings
        </label>
        <input
          :value="currentServings"
          @input="$emit('update:currentServings', parseInt(($event.target as HTMLInputElement).value) || 1)"
          type="number"
          min="1"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <p class="text-xs text-gray-500 mt-1">For preview/scaling</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  baseServings: number;
  currentServings: number;
}>();

defineEmits<{
  'update:baseServings': [value: number];
  'update:currentServings': [value: number];
}>();
</script>
