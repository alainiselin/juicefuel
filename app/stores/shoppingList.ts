import { defineStore } from 'pinia';
import type { ShoppingListResponse, ShoppingListDetail, ShoppingListStatus, Unit } from '../../spec/schemas';

export const useShoppingListStore = defineStore('shoppingList', () => {
  const shoppingList = ref<ShoppingListResponse | null>(null);
  const shoppingLists = ref<ShoppingListDetail[]>([]);
  const currentList = ref<ShoppingListDetail | null>(null);
  const loading = ref(false);
  const api = useApi();

  const fetchShoppingList = async (mealPlanId: string, from: string, to: string) => {
    loading.value = true;
    try {
      shoppingList.value = await api.getShoppingList(mealPlanId, from, to);
    } finally {
      loading.value = false;
    }
  };

  const fetchShoppingLists = async (status?: string) => {
    loading.value = true;
    try {
      shoppingLists.value = await api.getShoppingLists(status);
    } finally {
      loading.value = false;
    }
  };

  const fetchShoppingListById = async (id: string) => {
    loading.value = true;
    try {
      currentList.value = await api.getShoppingListById(id);
    } finally {
      loading.value = false;
    }
  };

  const createShoppingList = async (title: string) => {
    loading.value = true;
    try {
      const list = await api.createShoppingList({ 
        title, 
        status: 'ACTIVE',
        household_id: '' // Will be set by API from user context
      });
      if (list) {
        shoppingLists.value.unshift(list);
        currentList.value = list;
      }
      return list;
    } finally {
      loading.value = false;
    }
  };

  const updateShoppingList = async (id: string, data: { title?: string; status?: ShoppingListStatus; store_hint?: string | null }) => {
    loading.value = true;
    try {
      const updated = await api.updateShoppingList(id, data);
      if (updated) {
        const index = shoppingLists.value.findIndex(l => l.id === id);
        if (index !== -1) {
          shoppingLists.value[index] = updated;
        }
        if (currentList.value?.id === id) {
          currentList.value = updated;
        }
      }
      return updated;
    } finally {
      loading.value = false;
    }
  };

  const deleteShoppingList = async (id: string) => {
    loading.value = true;
    try {
      const success = await api.deleteShoppingList(id);
      if (success) {
        shoppingLists.value = shoppingLists.value.filter(l => l.id !== id);
        if (currentList.value?.id === id) {
          currentList.value = null;
        }
      }
      return success;
    } finally {
      loading.value = false;
    }
  };

  const addItem = async (listId: string, ingredientId?: string, quantity?: number, unit?: Unit, articleId?: string) => {
    const item = await api.addShoppingListItem(listId, {
      shopping_list_id: listId,
      ingredient_id: ingredientId,
      article_id: articleId,
      quantity,
      unit,
    });
    if (item && currentList.value?.id === listId) {
      currentList.value.items.push(item);
    }
    return item;
  };

  const toggleItemChecked = async (itemId: string, isChecked: boolean) => {
    const item = await api.updateShoppingListItem(itemId, { is_checked: isChecked });
    if (item && currentList.value) {
      const index = currentList.value.items.findIndex(i => i.id === itemId);
      if (index !== -1) {
        currentList.value.items[index] = item;
      }
    }
    return item;
  };

  const removeItem = async (itemId: string) => {
    const success = await api.deleteShoppingListItem(itemId);
    if (success && currentList.value) {
      currentList.value.items = currentList.value.items.filter(i => i.id !== itemId);
    }
    return success;
  };

  return {
    shoppingList,
    shoppingLists,
    currentList,
    loading,
    fetchShoppingList,
    fetchShoppingLists,
    fetchShoppingListById,
    createShoppingList,
    updateShoppingList,
    deleteShoppingList,
    addItem,
    toggleItemChecked,
    removeItem,
  };
});
