<template>
  <DesktopShell>
    <div class="h-full bg-gray-50 overflow-auto">
      <!-- Header -->
      <div class="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-bold text-gray-900">Shopping List</h1>
            <p v-if="currentList" class="text-sm text-gray-600 mt-1">{{ currentList.title }}</p>
          </div>
          <div class="flex gap-2">
            <button
              v-if="currentList && checkedItems.length > 0"
              @click="clearCheckedItems"
              class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Shopping Finished
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
      <div v-else class="max-w-7xl mx-auto py-6 px-4">
        <!-- Loading State -->
        <div v-if="loading" class="text-center py-12">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p class="text-gray-600 mt-4">Loading items...</p>
        </div>

        <!-- Inline Search Bar to Add Items -->
        <div v-else class="mb-6 bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Add items to your list
          </label>
          <div class="relative">
            <input
              ref="searchInput"
              v-model="searchQuery"
              @input="onSearchInput"
              @keydown.escape="clearSearch"
              @keydown.down.prevent="navigateResults(1)"
              @keydown.up.prevent="navigateResults(-1)"
              @keydown.enter.prevent="selectHighlightedResult"
              type="text"
              placeholder="Search ingredients... (e.g., tomato, milk, bread)"
              class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
            />
            
            <!-- Autocomplete Results -->
            <div
              v-if="searchResults.length > 0"
              class="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-auto z-20"
            >
              <button
                v-for="(result, index) in searchResults"
                :key="result.id"
                @click="addItemToList(result)"
                class="w-full px-4 py-3 text-left hover:bg-blue-50 border-b border-gray-100 last:border-b-0 transition-colors"
                :class="{ 'bg-blue-50': index === highlightedIndex }"
              >
                <div class="font-medium text-gray-900">{{ result.name }}</div>
                <div v-if="result.default_unit" class="text-xs text-gray-500 mt-0.5">
                  Default: {{ result.default_unit }}
                </div>
              </button>
            </div>
            
            <!-- No Results Message with Create Option -->
            <div
              v-if="searchQuery.length >= 2 && searchResults.length === 0 && !searchLoading"
              class="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20"
            >
              <button
                @click="createAndAddCustomItem"
                class="w-full px-4 py-3 text-left hover:bg-green-50 transition-colors flex items-center gap-2"
              >
                <span class="text-green-600">+</span>
                <div>
                  <div class="font-medium text-gray-900">Create "{{ searchQuery }}"</div>
                  <div class="text-xs text-gray-500 mt-0.5">Add to Own Items</div>
                </div>
              </button>
            </div>

            <!-- Loading State -->
            <div
              v-if="searchLoading"
              class="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-20"
            >
              <div class="flex items-center gap-2 text-sm text-gray-500">
                <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                Searching...
              </div>
            </div>
          </div>
        </div>

        <!-- Rubrics -->
        <div v-if="!loading" class="space-y-6">
          <div v-for="rubric in rubricsWithItems" :key="rubric.id">
            <!-- Rubric Header -->
            <div class="bg-white rounded-t-lg border border-gray-200 px-4 py-3">
              <button
                @click="toggleRubric(rubric.id)"
                class="w-full flex items-center justify-between"
              >
                <div class="flex items-center gap-2">
                  <h3 class="font-semibold text-gray-900 text-lg">{{ rubric.name }}</h3>
                  <span class="text-sm text-gray-500">({{ rubric.uncheckedCount }})</span>
                </div>
                <ChevronDown
                  :size="20"
                  class="text-gray-400 transition-transform"
                  :class="{ 'rotate-180': collapsedRubrics.has(rubric.id) }"
                />
              </button>
            </div>

            <!-- Rubric Content -->
            <div
              v-show="!collapsedRubrics.has(rubric.id)"
              class="bg-white rounded-b-lg border-x border-b border-gray-200 p-4"
            >
              <!-- Items Grid -->
              <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
                <ShoppingItemCard
                  v-for="item in rubric.items"
                  :key="item.id"
                  :item="item"
                  @toggle-checked="toggleItem"
                  @updated="onItemUpdated"
                  @delete="deleteItem(item.id)"
                  @open-detail="openItemDetail(item)"
                />
              </div>
            </div>
          </div>

          <!-- Checked Items Section (at the end) -->
          <div v-if="checkedItems.length > 0" class="mt-6">
            <div class="bg-white rounded-t-lg border border-gray-200 px-4 py-3">
              <button
                @click="toggleCheckedSection('all')"
                class="w-full flex items-center justify-between"
              >
                <div class="flex items-center gap-2">
                  <h3 class="font-semibold text-gray-900 text-lg">Checked Items</h3>
                  <span class="text-sm text-gray-500">({{ checkedItems.length }})</span>
                </div>
                <ChevronDown
                  :size="20"
                  class="text-gray-400 transition-transform"
                  :class="{ 'rotate-180': !expandedCheckedSections.has('all') }"
                />
              </button>
            </div>

            <div
              v-show="expandedCheckedSections.has('all')"
              class="bg-white rounded-b-lg border-x border-b border-gray-200 p-4"
            >
              <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
                <ShoppingItemCard
                  v-for="item in checkedItems"
                  :key="item.id"
                  :item="item"
                  @toggle-checked="toggleItem"
                  @updated="onItemUpdated"
                  @delete="deleteItem(item.id)"
                  @open-detail="openItemDetail(item)"
                />
              </div>
            </div>
          </div>

          <!-- Empty State for Selected List -->
          <div v-if="rubricsWithItems.length === 0" class="text-center py-12 bg-white rounded-lg border border-gray-200">
            <p class="text-gray-500 mb-4">Your shopping list is empty</p>
            <button
              @click="showAddItem = true"
              class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Add Your First Item
            </button>
          </div>
        </div>
      </div>

      <!-- Empty State (No Items) -->
      <div v-if="currentList && !loading && currentList.items.length === 0" class="flex flex-col items-center justify-center h-96">
        <div class="text-center">
          <ShoppingCart :size="64" class="text-gray-300 mb-4 mx-auto" />
          <h2 class="text-xl font-semibold text-gray-700 mb-2">Your list is empty</h2>
          <p class="text-gray-500">Start adding items using the search bar above</p>
        </div>
      </div>
    </div>

    <!-- Item Detail Modal -->
    <ShoppingItemDetailModal
      v-if="selectedItem"
      v-model="showItemDetailModal"
      :item="selectedItem"
      @updated="onItemUpdated"
      @delete="deleteItem(selectedItem.id)"
    />
  </DesktopShell>
</template>

<script setup lang="ts">
import { ShoppingCart, Plus, ChevronDown, ChevronRight } from 'lucide-vue-next';
import { useShoppingListStore } from '../stores/shoppingList';
import DesktopShell from '../components/layout/DesktopShell.vue';
import ShoppingItemCard from '../components/shopping/ShoppingItemCard.vue';
import ShoppingItemDetailModal from '../components/shopping/ShoppingItemDetailModal.vue';
import { SHOPPING_RUBRICS, getRubricForItem, type RubricId } from '../utils/ingredientFormatting';
import type { ShoppingListItemDetail } from '../../spec/schemas';

const store = useShoppingListStore();
const selectedListId = ref('');
const collapsedRubrics = ref(new Set<RubricId>());
const expandedCheckedSections = ref(new Set<RubricId>());
const loading = ref(false);

// Item detail modal state
const showItemDetailModal = ref(false);
const selectedItem = ref<ShoppingListItemDetail | null>(null);

// Inline search state
const searchQuery = ref('');
const searchResults = ref<Array<{ id: string; name: string; default_unit?: string }>>([]);
const searchLoading = ref(false);
const searchInput = ref<HTMLInputElement>();
const highlightedIndex = ref(0);
let searchTimeout: NodeJS.Timeout | null = null;

const lists = computed(() => store.shoppingLists);
const currentList = computed(() => store.currentList);

// Group items by rubric (only unchecked items)
const rubricsWithItems = computed(() => {
  if (!currentList.value) return [];

  const rubricMap = new Map<RubricId, {
    id: RubricId;
    name: string;
    items: ShoppingListItemDetail[];
    uncheckedCount: number;
  }>();

  // Initialize rubrics
  for (const rubric of SHOPPING_RUBRICS) {
    rubricMap.set(rubric.id, {
      id: rubric.id,
      name: rubric.name,
      items: [],
      uncheckedCount: 0,
    });
  }

  // Assign only unchecked items to rubrics
  for (const item of currentList.value.items) {
    if (!item.is_checked) {
      const rubricId = getRubricForItem(item.tags);
      const rubric = rubricMap.get(rubricId);
      if (rubric) {
        rubric.items.push(item);
        rubric.uncheckedCount++;
      }
    }
  }

  // Return only rubrics with unchecked items, in fixed order
  return SHOPPING_RUBRICS
    .map(r => rubricMap.get(r.id)!)
    .filter(r => r.items.length > 0);
});

// All checked items (for the "Checked Items" section at the end)
const checkedItems = computed(() => {
  if (!currentList.value) return [];
  return currentList.value.items.filter(item => item.is_checked);
});

onMounted(async () => {
  loading.value = true;
  try {
    await store.fetchShoppingLists('ACTIVE');
    if (lists.value.length > 0) {
      selectedListId.value = lists.value[0].id;
      await store.fetchShoppingListById(selectedListId.value);
    }
  } finally {
    loading.value = false;
  }
});

const onListChange = async () => {
  if (selectedListId.value) {
    loading.value = true;
    try {
      await store.fetchShoppingListById(selectedListId.value);
    } finally {
      loading.value = false;
    }
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

const toggleRubric = (rubricId: RubricId) => {
  if (collapsedRubrics.value.has(rubricId)) {
    collapsedRubrics.value.delete(rubricId);
  } else {
    collapsedRubrics.value.add(rubricId);
  }
};

const toggleCheckedSection = (rubricId: RubricId) => {
  if (expandedCheckedSections.value.has(rubricId)) {
    expandedCheckedSections.value.delete(rubricId);
  } else {
    expandedCheckedSections.value.add(rubricId);
  }
};

const toggleItem = async (itemId: string, newIsChecked: boolean) => {
  if (!currentList.value) return;
  
  try {
    // Update via API to get full item with tags back
    const updated = await $fetch(`/api/shopping-list-items/${itemId}`, {
      method: 'PATCH',
      body: { is_checked: newIsChecked },
    }) as ShoppingListItemDetail;
    
    // Diagnostic: log if tags are missing
    if (!updated.tags || updated.tags.length === 0) {
      console.warn(`⚠️  Item ${itemId} returned without tags after toggle!`);
    }
    
    // Update local state with full item (preserving tags)
    const index = currentList.value.items.findIndex(i => i.id === itemId);
    if (index !== -1) {
      currentList.value.items[index] = updated;
    }
  } catch (error) {
    console.error('Failed to toggle item:', error);
  }
};

const onItemUpdated = async (updated: ShoppingListItemDetail, aisleChanged?: boolean) => {
  if (!currentList.value) return;
  
  // If aisle changed, refetch the entire list to get updated tags
  if (aisleChanged) {
    await store.fetchShoppingListById(currentList.value.id);
    return;
  }
  
  // Diagnostic: log if tags are missing
  if (!updated.tags || updated.tags.length === 0) {
    console.warn(`⚠️  Item ${updated.id} returned without tags after update!`);
  }
  
  // Replace item in local state (preserving all data including tags)
  const index = currentList.value.items.findIndex(i => i.id === updated.id);
  if (index !== -1) {
    currentList.value.items[index] = updated;
  }
};

const deleteItem = async (itemId: string) => {
  if (!currentList.value) return;
  
  try {
    await $fetch(`/api/shopping-list-items/${itemId}`, {
      method: 'DELETE',
    });
    
    // Remove from local state
    currentList.value.items = currentList.value.items.filter(i => i.id !== itemId);
    
    // Close modal if this was the selected item
    if (selectedItem.value?.id === itemId) {
      showItemDetailModal.value = false;
      selectedItem.value = null;
    }
  } catch (error) {
    console.error('Failed to delete item:', error);
  }
};

const clearCheckedItems = async () => {
  if (!currentList.value || checkedItems.value.length === 0) return;
  
  try {
    // Delete all checked items
    await Promise.all(
      checkedItems.value.map(item => 
        $fetch(`/api/shopping-list-items/${item.id}`, {
          method: 'DELETE',
        })
      )
    );
    
    // Remove from local state
    currentList.value.items = currentList.value.items.filter(i => !i.is_checked);
    
    console.log(`✓ Removed ${checkedItems.value.length} checked items`);
  } catch (error) {
    console.error('Failed to clear checked items:', error);
    alert('Failed to clear some items. Please try again.');
  }
};

const openItemDetail = (item: ShoppingListItemDetail) => {
  selectedItem.value = item;
  showItemDetailModal.value = true;
};

// Inline search functions (reusing modal logic with debouncing)
const onSearchInput = () => {
  // Clear previous timeout
  if (searchTimeout) {
    clearTimeout(searchTimeout);
  }
  
  // Reset highlighted index
  highlightedIndex.value = 0;
  
  // If query too short, clear results
  if (searchQuery.value.length < 2) {
    searchResults.value = [];
    searchLoading.value = false;
    return;
  }
  
  // Show loading state
  searchLoading.value = true;
  
  // Debounce search (300ms)
  searchTimeout = setTimeout(async () => {
    await performSearch();
  }, 300);
};

const performSearch = async () => {
  if (searchQuery.value.length < 2) {
    searchResults.value = [];
    searchLoading.value = false;
    return;
  }
  
  try {
    // Use shopping-specific search endpoint that includes both ingredients and articles
    const response = await $fetch(`/api/shopping/items/search?query=${encodeURIComponent(searchQuery.value)}&limit=20`) as Array<{ 
      type: 'INGREDIENT' | 'ARTICLE';
      id: string; 
      name: string;
      default_unit?: string;
      aisle?: string;
    }>;
    
    searchResults.value = response.map(r => ({ 
      type: r.type,
      id: r.id, 
      name: r.name,
      default_unit: r.default_unit,
      aisle: r.aisle,
    }));
  } catch (error) {
    console.error('Failed to search items:', error);
    searchResults.value = [];
  } finally {
    searchLoading.value = false;
  }
};

const navigateResults = (direction: number) => {
  if (searchResults.value.length === 0) return;
  
  highlightedIndex.value += direction;
  
  if (highlightedIndex.value < 0) {
    highlightedIndex.value = searchResults.value.length - 1;
  } else if (highlightedIndex.value >= searchResults.value.length) {
    highlightedIndex.value = 0;
  }
};

const selectHighlightedResult = () => {
  if (searchResults.value.length > 0 && highlightedIndex.value >= 0) {
    addItemToList(searchResults.value[highlightedIndex.value]);
  }
};

const addItemToList = async (item: { type?: string; id: string; name: string; default_unit?: string }) => {
  if (!currentList.value) return;
  
  const isArticle = item.type === 'ARTICLE';
  
  // Check if item already in list
  const existing = currentList.value.items.find(i => 
    isArticle ? i.article_id === item.id : i.ingredient_id === item.id
  );
  
  if (existing) {
    // Show subtle feedback that item is already on list
    // For now, just increase quantity by 1
    try {
      const newQuantity = (existing.quantity || 1) + 1;
      const updated = await $fetch(`/api/shopping-list-items/${existing.id}`, {
        method: 'PATCH',
        body: { quantity: newQuantity },
      }) as ShoppingListItemDetail;
      
      const index = currentList.value.items.findIndex(i => i.id === existing.id);
      if (index !== -1) {
        currentList.value.items[index] = updated;
      }
      
      console.log(`✓ Increased quantity of "${item.name}" to ${newQuantity}`);
    } catch (error) {
      console.error('Failed to update quantity:', error);
    }
  } else {
    // Add new item with default quantity 1 and unit (backend will apply fallback if needed)
    try {
      const unit = item.default_unit || undefined;
      
      if (isArticle) {
        // Add article
        await store.addItem(
          currentList.value.id,
          undefined, // no ingredient_id
          1,
          unit,
          item.id // article_id
        );
      } else {
        // Add ingredient
        await store.addItem(
          currentList.value.id, 
          item.id, // ingredient_id
          1, 
          unit
        );
      }
      
      console.log(`✓ Added "${item.name}" to shopping list`);
    } catch (error) {
      console.error('Failed to add item:', error);
    }
  }
  
  // Clear search and refocus
  searchQuery.value = '';
  searchResults.value = [];
  highlightedIndex.value = 0;
  
  // Keep focus for fast repeated entry
  nextTick(() => searchInput.value?.focus());
};

const clearSearch = () => {
  searchQuery.value = '';
  searchResults.value = [];
  highlightedIndex.value = 0;
  searchLoading.value = false;
  if (searchTimeout) {
    clearTimeout(searchTimeout);
  }
};

const createAndAddCustomItem = async () => {
  if (!searchQuery.value || !currentList.value) return;
  
  try {
    // Create custom article (non-food item)
    const article = await $fetch('/api/shopping/articles', {
      method: 'POST',
      body: {
        name: searchQuery.value,
      },
    }) as { id: string; name: string; default_unit?: string; default_aisle: string };
    
    // Add to shopping list immediately
    await addItemToList({
      type: 'ARTICLE',
      id: article.id,
      name: article.name,
      default_unit: article.default_unit,
    });
    
    console.log(`✓ Created and added "${article.name}" to shopping list`);
  } catch (error) {
    console.error('Failed to create custom article:', error);
    alert('Failed to create custom item. Please try again.');
  }
};
</script>
