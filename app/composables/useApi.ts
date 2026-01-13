import type {
  Recipe,
  CreateRecipeInput,
  UpdateRecipeInput,
  MealPlanEntry,
  CreateMealPlanEntryInput,
  UpdateMealPlanEntryInput,
  ShoppingListResponse,
  ShoppingListDetail,
  CreateShoppingListInput,
  UpdateShoppingListInput,
  CreateShoppingListItemInput,
  UpdateShoppingListItemInput,
  ShoppingListItemDetail,
} from '../../spec/schemas';

export const useApi = () => {
  const handleError = (error: any) => {
    console.error('API Error:', error);
    const message = error?.data?.error || error?.message || 'An error occurred';
    throw new Error(message);
  };

  return {
    // Recipes
    async getRecipes(query?: string, recipeLibraryId?: string): Promise<Recipe[]> {
      try {
        const params: Record<string, string> = {};
        if (query) params.query = query;
        if (recipeLibraryId) params.recipe_library_id = recipeLibraryId;
        
        return await $fetch('/api/recipes', { params });
      } catch (error) {
        handleError(error);
        return [];
      }
    },

    async getRecipe(id: string): Promise<Recipe | null> {
      try {
        return await $fetch(`/api/recipes/${id}`);
      } catch (error) {
        handleError(error);
        return null;
      }
    },

    async createRecipe(data: CreateRecipeInput): Promise<Recipe | null> {
      try {
        return await $fetch('/api/recipes', {
          method: 'POST',
          body: data,
        });
      } catch (error) {
        handleError(error);
        return null;
      }
    },

    async updateRecipe(id: string, data: UpdateRecipeInput): Promise<Recipe | null> {
      try {
        return await $fetch(`/api/recipes/${id}`, {
          method: 'PATCH',
          body: data,
        });
      } catch (error) {
        handleError(error);
        return null;
      }
    },

    async deleteRecipe(id: string): Promise<boolean> {
      try {
        await $fetch(`/api/recipes/${id}`, { method: 'DELETE' });
        return true;
      } catch (error) {
        handleError(error);
        return false;
      }
    },

    // Meal Plan
    async getMealPlan(
      mealPlanId: string,
      from: string,
      to: string
    ): Promise<MealPlanEntry[]> {
      try {
        return await $fetch('/api/meal-plan', {
          params: { meal_plan_id: mealPlanId, from, to },
        });
      } catch (error) {
        handleError(error);
        return [];
      }
    },

    async createMealPlanEntry(data: CreateMealPlanEntryInput): Promise<MealPlanEntry | null> {
      try {
        return await $fetch('/api/meal-plan', {
          method: 'POST',
          body: data,
        });
      } catch (error) {
        handleError(error);
        return null;
      }
    },

    async updateMealPlanEntry(
      id: string,
      data: UpdateMealPlanEntryInput
    ): Promise<MealPlanEntry | null> {
      try {
        return await $fetch(`/api/meal-plan/${id}`, {
          method: 'PATCH',
          body: data,
        });
      } catch (error) {
        handleError(error);
        return null;
      }
    },

    async deleteMealPlanEntry(id: string): Promise<boolean> {
      try {
        await $fetch(`/api/meal-plan/${id}`, { method: 'DELETE' });
        return true;
      } catch (error) {
        handleError(error);
        return false;
      }
    },

    // Shopping List (aggregated from meal plan)
    async getShoppingList(
      mealPlanId: string,
      from: string,
      to: string
    ): Promise<ShoppingListResponse | null> {
      try {
        return await $fetch('/api/shopping-list/generate', {
          params: { meal_plan_id: mealPlanId, from, to },
        });
      } catch (error) {
        handleError(error);
        return null;
      }
    },

    // Shopping Lists (CRUD)
    async getShoppingLists(status?: string): Promise<ShoppingListDetail[]> {
      try {
        const params = status ? { status } : {};
        return await $fetch('/api/shopping-list', { params });
      } catch (error) {
        handleError(error);
        return [];
      }
    },

    async getShoppingListById(id: string): Promise<ShoppingListDetail | null> {
      try {
        return await $fetch(`/api/shopping-list/${id}`);
      } catch (error) {
        handleError(error);
        return null;
      }
    },

    async createShoppingList(data: CreateShoppingListInput): Promise<ShoppingListDetail | null> {
      try {
        return await $fetch('/api/shopping-list', {
          method: 'POST',
          body: data,
        });
      } catch (error) {
        handleError(error);
        return null;
      }
    },

    async updateShoppingList(id: string, data: UpdateShoppingListInput): Promise<ShoppingListDetail | null> {
      try {
        return await $fetch(`/api/shopping-list/${id}`, {
          method: 'PATCH',
          body: data,
        });
      } catch (error) {
        handleError(error);
        return null;
      }
    },

    async deleteShoppingList(id: string): Promise<boolean> {
      try {
        await $fetch(`/api/shopping-list/${id}`, { method: 'DELETE' });
        return true;
      } catch (error) {
        handleError(error);
        return false;
      }
    },

    async addShoppingListItem(listId: string, data: CreateShoppingListItemInput): Promise<ShoppingListItemDetail | null> {
      try {
        return await $fetch(`/api/shopping-list/${listId}/items`, {
          method: 'POST',
          body: data,
        });
      } catch (error) {
        handleError(error);
        return null;
      }
    },

    async updateShoppingListItem(itemId: string, data: UpdateShoppingListItemInput): Promise<ShoppingListItemDetail | null> {
      try {
        return await $fetch(`/api/shopping-list-items/${itemId}`, {
          method: 'PATCH',
          body: data,
        });
      } catch (error) {
        handleError(error);
        return null;
      }
    },

    async deleteShoppingListItem(itemId: string): Promise<boolean> {
      try {
        await $fetch(`/api/shopping-list-items/${itemId}`, { method: 'DELETE' });
        return true;
      } catch (error) {
        handleError(error);
        return false;
      }
    },
  };
};
