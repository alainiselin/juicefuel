<template>
  <DesktopShell>
    <div class="h-full bg-gray-50 overflow-auto">
      <!-- Header -->
      <div class="bg-white border-b border-gray-200 px-6 py-4">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-bold text-gray-900">Shopping List</h1>
            <p v-if="currentList" class="text-sm text-gray-600 mt-1">{{ currentList.title }}</p>
          </div>
          <div class="flex gap-2">
            <button
              v-if="currentList"
              @click="showAddItem = true"
              class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus :size="20" />
              Add Item
            </button>
            <button
              @click="createNew"
              class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              New List
            </button>
          </div>
        </div>

        <!-- List Selector -->
        <div v-if="lists.length > 0" class="mt-4">
          <select
            v-model="selectedListId"
            @change="onListChange"
            class="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select a list...</option>
            <option v-for="list in lists" :key="list.id" :value="list.id">
              {{ list.title }} ({{ list.items.length }} items)
            </option>
          </select>
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="!currentList" class="flex flex-col items-center justify-center h-96">
        <ShoppingCart :size="64" class="text-gray-300 mb-4" />
        <h2 class="text-xl font-semibold text-gray-700 mb-2">No Shopping List</h2>
        <p class="text-gray-500 mb-4">Create a new shopping list to get started</p>
        <button
          @click="createNew"
          class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Create Your First List
        </button>
      </div>

      <!-- Shopping List Content -->
      <div v-else class="max-w-4xl mx-auto py-6 px-4">
        <!-- Rubrics -->
        <div v-for="rubric in rubrics" :key="rubric.slug" class="mb-4">
          <div
            v-if="getRubricItems(rubric.slug).length > 0"
            class="bg-white rounded-lg shadow-sm overflow-hidden"
          >
            <button
              @click="toggleRubric(rubric.slug)"
              class="w-full px-4 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <div class="flex items-center gap-2">
                <component :is="rubric.icon" :size="20" class="text-gray-600" />
                <h3 class="font-semibold text-gray-900">{{ rubric.name }}</h3>
                <span class="text-sm text-gray-500">
                  ({{ getRubricItems(rubric.slug).length }})
                </span>
              </div>
              <ChevronDown
                :size="20"
                class="text-gray-400 transition-transform"
                :class="{ 'rotate-180': collapsedRubrics.has(rubric.slug) }"
              />
            </button>

            <div v-show="!collapsedRubrics.has(rubric.slug)" class="divide-y divide-gray-100">
              <div
                v-for="item in getRubricItems(rubric.slug)"
                :key="item.id"
                class="px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors"
                :class="{ 'opacity-50': item.is_checked }"
              >
                <input
                  type="checkbox"
                  :checked="item.is_checked"
                  @change="toggleItem(item.id, !item.is_checked)"
                  class="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <div class="flex-1">
                  <p
                    class="font-medium text-gray-900"
                    :class="{ 'line-through': item.is_checked }"
                  >
                    {{ item.ingredient.name }}
                  </p>
                  <p v-if="item.quantity" class="text-sm text-gray-600">
                    {{ item.quantity }} {{ item.unit || '' }}
                  </p>
                </div>
                <button
                  @click="removeItemConfirm(item)"
                  class="text-gray-400 hover:text-red-600 transition-colors"
                >
                  <Trash2 :size="18" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- No Items -->
        <div v-if="currentList.items.length === 0" class="text-center py-12">
          <p class="text-gray-500 mb-4">Your shopping list is empty</p>
          <button
            @click="showAddItem = true"
            class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Add Your First Item
          </button>
        </div>
      </div>

      <!-- Add Item Modal -->
      <div
        v-if="showAddItem"
        class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        @click.self="showAddItem = false"
      >
        <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
          <h3 class="text-xl font-semibold mb-4">Add Item</h3>
          
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Ingredient
              </label>
              <input
                v-model="newItem.ingredientSearch"
                type="text"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Search ingredients..."
                @input="searchIngredients"
              />
              <div
                v-if="ingredientResults.length > 0"
                class="mt-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg"
              >
                <button
                  v-for="ing in ingredientResults"
                  :key="ing.id"
                  @click="selectIngredient(ing)"
                  class="w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors"
                >
                  {{ ing.name }}
                </button>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Quantity
                </label>
                <input
                  v-model.number="newItem.quantity"
                  type="number"
                  step="0.1"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="1"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Unit
                </label>
                <select
                  v-model="newItem.unit"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">None</option>
                  <option value="PIECE">Piece</option>
                  <option value="G">g</option>
                  <option value="KG">kg</option>
                  <option value="ML">ml</option>
                  <option value="L">L</option>
                  <option value="PACKAGE">Package</option>
                </select>
              </div>
            </div>
          </div>

          <div class="flex gap-2 mt-6">
            <button
              @click="addItem"
              :disabled="!newItem.ingredientId"
              class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add
            </button>
            <button
              @click="showAddItem = false"
              class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  </DesktopShell>
</template>

<script setup lang="ts">
import { ShoppingCart, Plus, ChevronDown, Trash2, Apple, Croissant, Milk, Fish, Leaf, Wheat, Snowflake, Candy, Coffee, Home, Sparkles, Dog, TreePine } from 'lucide-vue-next';
import { useShoppingListStore } from '../stores/shoppingList';
import DesktopShell from '../components/layout/DesktopShell.vue';
import type { ShoppingListItemDetail } from '../../spec/schemas';

const store = useShoppingListStore();
const selectedListId = ref('');
const showAddItem = ref(false);
const collapsedRubrics = ref(new Set<string>());

const newItem = ref({
  ingredientId: '',
  ingredientSearch: '',
  quantity: undefined as number | undefined,
  unit: '' as string,
});

const ingredientResults = ref<Array<{ id: string; name: string }>>([]);

const rubrics = [
  { name: 'Fruits & Vegetables', slug: 'fruits-vegetables', icon: Apple },
  { name: 'Bread & Pastries', slug: 'bread-pastries', icon: Croissant },
  { name: 'Milk & Cheese', slug: 'milk-cheese', icon: Milk },
  { name: 'Meat & Fish', slug: 'meat-fish', icon: Fish },
  { name: 'Ingredients & Spices', slug: 'ingredients-spices', icon: Leaf },
  { name: 'Grain Products', slug: 'grain-products', icon: Wheat },
  { name: 'Frozen & Convenience', slug: 'frozen-convenience', icon: Snowflake },
  { name: 'Snacks & Sweets', slug: 'snacks-sweets', icon: Candy },
  { name: 'Beverages', slug: 'beverages', icon: Coffee },
  { name: 'Household', slug: 'household', icon: Home },
  { name: 'Care & Health', slug: 'care-health', icon: Sparkles },
  { name: 'Pet Supplies', slug: 'pet-supplies', icon: Dog },
  { name: 'Home & Garden', slug: 'home-garden', icon: TreePine },
  { name: 'Own Items', slug: 'own-items', icon: ShoppingCart },
];

const lists = computed(() => store.shoppingLists);
const currentList = computed(() => store.currentList);

onMounted(async () => {
  await store.fetchShoppingLists('ACTIVE');
  if (lists.value.length > 0) {
    selectedListId.value = lists.value[0].id;
    await store.fetchShoppingListById(selectedListId.value);
  }
});

const onListChange = async () => {
  if (selectedListId.value) {
    await store.fetchShoppingListById(selectedListId.value);
  }
};

const createNew = async () => {
  const title = prompt('Enter shopping list name:');
  if (title) {
    const list = await store.createShoppingList(title);
    if (list) {
      selectedListId.value = list.id;
      await store.fetchShoppingLists('ACTIVE');
    }
  }
};

const getRubricItems = (rubricSlug: string) => {
  if (!currentList.value) return [];
  
  return currentList.value.items.filter(item => {
    const aisleTag = item.tags.find(tag => tag.kind === 'AISLE');
    if (aisleTag) {
      return aisleTag.slug === rubricSlug;
    }
    // Default to "Own Items" if no AISLE tag
    return rubricSlug === 'own-items';
  });
};

const toggleRubric = (slug: string) => {
  if (collapsedRubrics.value.has(slug)) {
    collapsedRubrics.value.delete(slug);
  } else {
    collapsedRubrics.value.add(slug);
  }
};

const toggleItem = async (itemId: string, isChecked: boolean) => {
  await store.toggleItemChecked(itemId, isChecked);
};

const removeItemConfirm = async (item: ShoppingListItemDetail) => {
  if (confirm(`Remove ${item.ingredient.name} from list?`)) {
    await store.removeItem(item.id);
  }
};

const searchIngredients = async () => {
  if (newItem.value.ingredientSearch.length < 2) {
    ingredientResults.value = [];
    return;
  }
  
  try {
    const response = await $fetch(`/api/ingredients?query=${newItem.value.ingredientSearch}`) as Array<{ id: string; canonical_name: string }>;
    ingredientResults.value = response.map(r => ({ id: r.id, name: r.canonical_name }));
  } catch (error) {
    console.error('Failed to search ingredients:', error);
  }
};

const selectIngredient = (ingredient: { id: string; name: string }) => {
  newItem.value.ingredientId = ingredient.id;
  newItem.value.ingredientSearch = ingredient.name;
  ingredientResults.value = [];
};

const addItem = async () => {
  if (!currentList.value || !newItem.value.ingredientId) return;

  await store.addItem(
    currentList.value.id,
    newItem.value.ingredientId,
    newItem.value.quantity,
    newItem.value.unit || undefined
  );

  // Reset form
  newItem.value = {
    ingredientId: '',
    ingredientSearch: '',
    quantity: undefined,
    unit: '',
  };
  showAddItem.value = false;
};
</script>
