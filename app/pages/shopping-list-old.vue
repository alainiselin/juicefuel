<template>
  <div class="min-h-screen bg-gray-100">
    <div class="container mx-auto px-4 py-8">
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-3xl font-bold text-gray-900">Shopping List</h1>
        <NuxtLink to="/" class="text-blue-600 hover:underline">← Home</NuxtLink>
      </div>

      <div class="mb-6 bg-white p-4 rounded-lg shadow">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Meal Plan ID</label>
            <input
              v-model="mealPlanId"
              type="text"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="UUID"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">From</label>
            <input
              v-model="fromDate"
              type="date"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">To</label>
            <input
              v-model="toDate"
              type="date"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
        </div>
        <button
          @click="loadShoppingList"
          class="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Generate Shopping List
        </button>
      </div>

      <div v-if="store.loading" class="text-center py-8">
        <p class="text-gray-600">Generating shopping list...</p>
      </div>

      <div v-else-if="store.shoppingList" class="bg-white rounded-lg shadow">
        <div class="p-4 border-b">
          <p class="text-sm text-gray-600">
            Shopping list for {{ formatDate(store.shoppingList.from) }} to {{ formatDate(store.shoppingList.to) }}
          </p>
        </div>

        <div class="divide-y">
          <div
            v-for="item in store.shoppingList.items"
            :key="`${item.ingredient_name}-${item.unit}`"
            class="p-4"
          >
            <div class="flex justify-between items-start">
              <div class="flex-1">
                <p class="font-semibold text-gray-800">{{ item.ingredient_name }}</p>
                <p class="text-sm text-gray-600">
                  {{ item.total_quantity !== null ? item.total_quantity : 'To taste' }}
                  {{ item.unit || '' }}
                </p>
                <p class="text-xs text-gray-500 mt-1">
                  Used in: {{ item.recipes.join(', ') }}
                </p>
              </div>
            </div>
          </div>

          <p v-if="store.shoppingList.items.length === 0" class="p-8 text-center text-gray-600">
            No ingredients found for this date range
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useShoppingListStore } from '../stores/shoppingList';

const store = useShoppingListStore();
const mealPlanId = ref('');
const fromDate = ref('');
const toDate = ref('');

// Set default dates to this week
onMounted(() => {
  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  fromDate.value = weekStart.toISOString().split('T')[0];
  toDate.value = weekEnd.toISOString().split('T')[0];
});

const loadShoppingList = async () => {
  if (!mealPlanId.value || !fromDate.value || !toDate.value) {
    alert('Please fill all fields');
    return;
  }
  await store.fetchShoppingList(mealPlanId.value, fromDate.value, toDate.value);
};

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};
</script>
