<template>
  <DesktopShell>
    <div class="h-full bg-gray-50 overflow-auto">
      <!-- Header -->
      <div class="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-bold text-gray-900">Shopping List</h1>
            <p v-if="currentList" class="text-sm text-gray-600 mt-1">
              {{ currentList.store_hint || `${currentList.items.length} items` }}
            </p>
          </div>
          <div class="flex gap-2">
            <button
              v-if="currentList && checkedItems.length > 0"
              @click="clearCheckedItems"
              class="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              <CheckCircle2 :size="18" />
              Shopping Finished
            </button>
            <button
              v-if="lists.length > 0"
              @click="showGeneratorModal = true"
              class="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Sparkles :size="18" />
              Generate from Meal Plan
            </button>
            <button
              @click="showListManager = !showListManager"
              class="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              <ListChecks :size="18" />
              Manage Lists
            </button>
            <button
              @click="openCreateList"
              class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              <Plus :size="18" class="inline-block mr-1.5 align-text-bottom" />
              New List
            </button>
          </div>
        </div>

        <!-- List Selector -->
        <div v-if="lists.length > 0" class="mt-4">
          <div class="flex flex-wrap gap-2">
            <button
              v-for="list in lists"
              :key="list.id"
              @click="selectList(list.id)"
              class="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors"
              :class="selectedListId === list.id
                ? 'border-blue-600 bg-blue-50 text-blue-700'
                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'"
            >
              <span class="font-medium">{{ list.title }}</span>
              <span class="rounded-full bg-white/80 px-2 py-0.5 text-xs text-gray-500">{{ list.items.length }}</span>
            </button>
          </div>

          <div
            v-if="showListManager"
            class="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-3"
          >
            <div class="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              <div
                v-for="list in lists"
                :key="`manage-${list.id}`"
                class="rounded-lg border border-gray-200 bg-white p-3"
              >
                <div class="flex items-start justify-between gap-3">
                  <button
                    @click="selectList(list.id)"
                    class="min-w-0 text-left"
                  >
                    <div class="truncate font-semibold text-gray-900">{{ list.title }}</div>
                    <div class="mt-1 flex items-center gap-2 text-xs text-gray-500">
                      <Store :size="14" />
                      <span>{{ list.store_hint || 'Any store' }}</span>
                      <span>{{ list.items.length }} items</span>
                    </div>
                  </button>
                  <span
                    v-if="selectedListId === list.id"
                    class="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700"
                  >
                    Active
                  </span>
                </div>
                <div class="mt-3 flex gap-2">
                  <button
                    @click="openRenameList(list)"
                    class="inline-flex items-center gap-1.5 rounded-md border border-gray-200 px-2.5 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Pencil :size="15" />
                    Rename
                  </button>
                  <button
                    @click="archiveList(list.id)"
                    class="inline-flex items-center gap-1.5 rounded-md border border-gray-200 px-2.5 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Archive :size="15" />
                    Archive
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="!currentList" class="flex flex-col items-center justify-center h-96">
        <ShoppingCart :size="64" class="text-gray-300 mb-4" />
        <h2 class="text-xl font-semibold text-gray-700 mb-2">No Shopping List</h2>
        <p class="text-gray-500 mb-4">Create a new shopping list to get started</p>
        <button
          @click="openCreateList"
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
              <div class="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
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
              <div class="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
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
              @click="searchInput?.focus()"
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

    <!-- Generator Modal -->
    <ShoppingListGeneratorModal
      v-model="showGeneratorModal"
      :lists="lists"
      :default-list-id="selectedListId"
      :meal-plan-id="mealPlanId"
      @generated="onGenerated"
    />

    <!-- List Create/Rename Modal -->
    <div
      v-if="showListDialog"
      class="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 px-4"
      @click.self="closeListDialog"
    >
      <div class="w-full max-w-md rounded-lg bg-white shadow-xl">
        <div class="border-b border-gray-200 px-5 py-4">
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-semibold text-gray-900">
              {{ listDialogMode === 'create' ? 'New Shopping List' : 'Rename List' }}
            </h2>
            <button
              @click="closeListDialog"
              class="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              aria-label="Close"
            >
              <X :size="20" />
            </button>
          </div>
        </div>

        <form class="space-y-4 px-5 py-5" @submit.prevent="submitListDialog">
          <div>
            <label for="list-title" class="block text-sm font-medium text-gray-700">Name</label>
            <input
              id="list-title"
              ref="listTitleInput"
              v-model="listFormTitle"
              type="text"
              maxlength="80"
              placeholder="Weekly groceries"
              class="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">Store</label>
            <div class="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
              <button
                v-for="storeName in storeOptions"
                :key="storeName"
                type="button"
                @click="listFormStoreHint = storeName === listFormStoreHint ? '' : storeName"
                class="rounded-lg border px-3 py-2 text-sm font-medium transition-colors"
                :class="listFormStoreHint === storeName
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'"
              >
                {{ storeName }}
              </button>
            </div>
          </div>

          <p v-if="listFormError" class="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {{ listFormError }}
          </p>

          <div class="flex justify-end gap-2 pt-1">
            <button
              type="button"
              @click="closeListDialog"
              class="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="listSaving"
              class="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Plus v-if="listDialogMode === 'create'" :size="18" />
              <Pencil v-else :size="18" />
              {{ listDialogMode === 'create' ? 'Create List' : 'Save Changes' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </DesktopShell>
</template>

<script setup lang="ts">
import { Archive, CheckCircle2, ChevronDown, ListChecks, Pencil, Plus, ShoppingCart, Sparkles, Store, X } from 'lucide-vue-next';
import { useShoppingListStore } from '../stores/shoppingList';
import DesktopShell from '../components/layout/DesktopShell.vue';
import ShoppingItemCard from '../components/shopping/ShoppingItemCard.vue';
import ShoppingItemDetailModal from '../components/shopping/ShoppingItemDetailModal.vue';
import ShoppingListGeneratorModal from '../components/shopping/ShoppingListGeneratorModal.vue';
import { SHOPPING_RUBRICS, getRubricForItem, type RubricId } from '../utils/ingredientFormatting';
import type { ShoppingListDetail, ShoppingListItemDetail, Unit } from '../../spec/schemas';

const store = useShoppingListStore();
const selectedListId = ref('');
const collapsedRubrics = ref(new Set<RubricId>());
const expandedCheckedSections = ref(new Set<RubricId | 'all'>());
const loading = ref(false);
const showListManager = ref(false);

// Item detail modal state
const showItemDetailModal = ref(false);
const selectedItem = ref<ShoppingListItemDetail | null>(null);

// Generator modal state
const showGeneratorModal = ref(false);
const mealPlanId = ref<string | null>(null);

// Shopping list modal state
const showListDialog = ref(false);
const listDialogMode = ref<'create' | 'rename'>('create');
const listFormTitle = ref('');
const listFormStoreHint = ref('');
const listFormError = ref('');
const listSaving = ref(false);
const editingList = ref<ShoppingListDetail | null>(null);
const listTitleInput = ref<HTMLInputElement>();
const storeOptions = ['Aldi', 'Migros', 'Coop', 'Lidl', 'Denner', 'Online'];

// Inline search state
const searchQuery = ref('');
const searchResults = ref<Array<{ type?: string; id: string; name: string; default_unit?: Unit }>>([]);
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

onMounted(() => {
  // Stale-while-revalidate: render any cached state immediately and refresh in the
  // background. Only show a spinner if there's nothing cached yet (cold start).
  const hasCachedList = lists.value.length > 0 && currentList.value !== null;
  const silent = hasCachedList;
  if (!silent) loading.value = true;

  // Restore the previously-selected list if it still exists; otherwise fall back to
  // the first list so the user lands on something usable on a cold start.
  if (currentList.value && !selectedListId.value) {
    selectedListId.value = currentList.value.id;
  }

  void (async () => {
    try {
      await store.fetchShoppingLists('ACTIVE', { silent });
      const stillExists = lists.value.find((l) => l.id === selectedListId.value);
      const target = stillExists ?? lists.value[0];
      if (target) {
        selectedListId.value = target.id;
        await store.fetchShoppingListById(target.id, { silent });
      }
    } finally {
      if (!silent) loading.value = false;
    }
  })();

  // Resolve the household's meal plan id once for the generator modal. Skip if cached.
  if (mealPlanId.value === null) {
    void (async () => {
      try {
        const households = await $fetch<Array<{ id: string; meal_plan?: { id: string } | null }>>('/api/households');
        const withPlan = households.find((h) => h.meal_plan?.id);
        mealPlanId.value = withPlan?.meal_plan?.id ?? null;
      } catch (err) {
        console.error('Failed to load meal plan:', err);
      }
    })();
  }
});

const onGenerated = async (listId: string) => {
  if (selectedListId.value !== listId) {
    selectedListId.value = listId;
  }
  await store.fetchShoppingListById(listId);
  await store.fetchShoppingLists('ACTIVE');
};

const selectList = async (listId: string) => {
  if (!listId || selectedListId.value === listId) return;

  selectedListId.value = listId;
  loading.value = true;
  try {
    await store.fetchShoppingListById(listId);
  } finally {
    loading.value = false;
  }
};

const openCreateList = () => {
  listDialogMode.value = 'create';
  editingList.value = null;
  listFormTitle.value = '';
  listFormStoreHint.value = '';
  listFormError.value = '';
  showListDialog.value = true;
  nextTick(() => listTitleInput.value?.focus());
};

const openRenameList = (list: ShoppingListDetail) => {
  listDialogMode.value = 'rename';
  editingList.value = list;
  listFormTitle.value = list.title;
  listFormStoreHint.value = list.store_hint || '';
  listFormError.value = '';
  showListDialog.value = true;
  nextTick(() => listTitleInput.value?.focus());
};

const closeListDialog = () => {
  showListDialog.value = false;
  listSaving.value = false;
  listFormError.value = '';
};

const submitListDialog = async () => {
  const title = listFormTitle.value.trim();
  if (!title) {
    listFormError.value = 'Enter a list name.';
    return;
  }

  listSaving.value = true;
  listFormError.value = '';

  try {
    if (listDialogMode.value === 'create') {
      const list = await store.createShoppingList(title);
      if (!list) {
        listFormError.value = 'Could not create the list.';
        return;
      }

      selectedListId.value = list.id;
      if (listFormStoreHint.value) {
        await store.updateShoppingList(list.id, { store_hint: listFormStoreHint.value });
      }
      await store.fetchShoppingLists('ACTIVE');
      await store.fetchShoppingListById(list.id);
    } else if (editingList.value) {
      const updated = await store.updateShoppingList(editingList.value.id, {
        title,
        store_hint: listFormStoreHint.value || null,
      });
      if (!updated) {
        listFormError.value = 'Could not save the list.';
        return;
      }
      await store.fetchShoppingLists('ACTIVE');
    }

    showListDialog.value = false;
  } finally {
    listSaving.value = false;
  }
};

const archiveList = async (listId: string) => {
  const archived = await store.updateShoppingList(listId, { status: 'ARCHIVED' });
  if (!archived) return;

  await store.fetchShoppingLists('ACTIVE');

  if (selectedListId.value === listId) {
    const nextList = lists.value[0];
    if (nextList) {
      selectedListId.value = nextList.id;
      await store.fetchShoppingListById(nextList.id);
    } else {
      selectedListId.value = '';
      store.currentList = null;
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

const toggleCheckedSection = (rubricId: RubricId | 'all') => {
  if (expandedCheckedSections.value.has(rubricId)) {
    expandedCheckedSections.value.delete(rubricId);
  } else {
    expandedCheckedSections.value.add(rubricId);
  }
};

const toggleItem = async (itemId: string, newIsChecked: boolean) => {
  if (!currentList.value) return;
  // Item hasn't been confirmed by the server yet (optimistic add still pending) — skip.
  if (isTempId(itemId)) return;

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

  // Optimistic delete: drop locally first, then call DELETE in the background.
  const previous = currentList.value.items.slice();
  currentList.value.items = currentList.value.items.filter((i) => i.id !== itemId);
  if (selectedItem.value?.id === itemId) {
    showItemDetailModal.value = false;
    selectedItem.value = null;
  }

  // Temp items were never persisted server-side — skip the network call.
  if (isTempId(itemId)) return;

  try {
    await $fetch(`/api/shopping-list-items/${itemId}`, { method: 'DELETE' });
  } catch (error) {
    // Revert on failure.
    currentList.value.items = previous;
    console.error('Failed to delete item:', error);
    alert('Failed to delete item — please try again.');
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
      default_unit?: Unit;
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
  const result = searchResults.value[highlightedIndex.value];
  if (result) {
    addItemToList(result);
  }
};

/// Add a search-result hit to the current list. Returns immediately so the input is ready
/// for the next entry; the network call happens in the background.
///
/// - If the item is already on the list, increment its quantity (optimistic).
/// - Otherwise, push a temp row that looks like the future server response and replace it
///   with the real one when the POST returns. On failure, remove the temp / revert.
const addItemToList = (item: { type?: string; id: string; name: string; default_unit?: Unit; aisle?: string }) => {
  if (!currentList.value) return;
  const list = currentList.value;
  const isArticle = item.type === 'ARTICLE';

  const existing = list.items.find((i) =>
    isArticle ? i.article_id === item.id : i.ingredient_id === item.id
  );

  if (existing) {
    optimisticIncrementQuantity(existing);
  } else {
    optimisticAddNewItem(item, isArticle);
  }

  // Clear search and refocus for fast repeated entry — happens immediately, no awaiting.
  searchQuery.value = '';
  searchResults.value = [];
  highlightedIndex.value = 0;
  nextTick(() => searchInput.value?.focus());
};

const isTempId = (id: string) => id.startsWith('temp-');

function optimisticIncrementQuantity(existing: ShoppingListItemDetail) {
  if (!currentList.value) return;
  // Don't fire a network call against an item that doesn't exist server-side yet.
  if (isTempId(existing.id)) return;

  const newQuantity = (existing.quantity || 1) + 1;
  const prevQuantity = existing.quantity;
  const id = existing.id;

  // Apply optimistically.
  const idx = currentList.value.items.findIndex((i) => i.id === id);
  if (idx !== -1) {
    currentList.value.items[idx] = { ...existing, quantity: newQuantity };
  }

  void (async () => {
    try {
      const updated = (await $fetch(`/api/shopping-list-items/${id}`, {
        method: 'PATCH',
        body: { quantity: newQuantity },
      })) as ShoppingListItemDetail;

      const cur = currentList.value;
      if (!cur) return;
      const i = cur.items.findIndex((x) => x.id === id);
      if (i !== -1) cur.items[i] = updated;
    } catch (error) {
      // Roll back.
      const cur = currentList.value;
      if (!cur) return;
      const i = cur.items.findIndex((x) => x.id === id);
      if (i !== -1) cur.items[i] = { ...cur.items[i], quantity: prevQuantity };
      console.error('Failed to update quantity:', error);
    }
  })();
}

function optimisticAddNewItem(
  item: { id: string; name: string; default_unit?: Unit; aisle?: string },
  isArticle: boolean
) {
  if (!currentList.value) return;
  const list = currentList.value;
  const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const now = new Date().toISOString();

  // Build a fake AISLE tag from the search result's aisle so the new card lands in the
  // right rubric immediately. Falls back to "Own Items" when aisle is unknown.
  const tempTags = item.aisle
    ? [
        {
          id: `aisle-${item.aisle}`,
          label: item.aisle.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
          slug: item.aisle,
          kind: 'AISLE',
          scope: 'GLOBAL' as const,
          household_id: null,
          created_at: now,
        },
      ]
    : [];

  const tempItem: ShoppingListItemDetail = {
    id: tempId,
    shopping_list_id: list.id,
    ingredient_id: isArticle ? null : item.id,
    article_id: isArticle ? item.id : null,
    quantity: 1,
    unit: item.default_unit ?? null,
    note: null,
    is_checked: false,
    created_at: now,
    updated_at: now,
    ingredient: !isArticle
      ? {
          id: item.id,
          name: item.name,
          default_unit: item.default_unit ?? null,
          created_at: now,
          updated_at: now,
        }
      : null,
    article: isArticle
      ? {
          id: item.id,
          name: item.name,
          default_unit: item.default_unit ?? null,
        }
      : null,
    tags: tempTags,
  };

  list.items.push(tempItem);

  void (async () => {
    try {
      const real = (await $fetch(`/api/shopping-list/${list.id}/items`, {
        method: 'POST',
        body: {
          ingredient_id: !isArticle ? item.id : undefined,
          article_id: isArticle ? item.id : undefined,
          quantity: 1,
          unit: item.default_unit,
        },
      })) as ShoppingListItemDetail;

      const cur = currentList.value;
      if (!cur) return;
      const idx = cur.items.findIndex((i) => i.id === tempId);
      if (idx !== -1) cur.items[idx] = real;
    } catch (error) {
      const cur = currentList.value;
      if (cur) cur.items = cur.items.filter((i) => i.id !== tempId);
      console.error('Failed to add item:', error);
      alert(`Failed to add "${item.name}" — please try again.`);
    }
  })();
}

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
    // Article creation needs a real ID before we can attach it to the list, so this part
    // is unavoidable. Once we have the article, the add-to-list itself is optimistic.
    const article = await $fetch('/api/shopping/articles', {
      method: 'POST',
      body: { name: searchQuery.value },
    }) as { id: string; name: string; default_unit?: Unit; default_aisle: string };

    addItemToList({
      type: 'ARTICLE',
      id: article.id,
      name: article.name,
      default_unit: article.default_unit,
      aisle: article.default_aisle,
    });
  } catch (error) {
    console.error('Failed to create custom article:', error);
    alert('Failed to create custom item. Please try again.');
  }
};
</script>
