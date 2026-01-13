import { defineStore } from 'pinia';
import type { Recipe, CreateRecipeInput, UpdateRecipeInput } from '../../spec/schemas';

export const useRecipesStore = defineStore('recipes', () => {
  const recipes = ref<Recipe[]>([]);
  const loading = ref(false);
  const api = useApi();

  const fetchRecipes = async (query?: string, recipeLibraryId?: string) => {
    loading.value = true;
    try {
      recipes.value = await api.getRecipes(query, recipeLibraryId);
    } finally {
      loading.value = false;
    }
  };

  const createRecipe = async (data: CreateRecipeInput) => {
    const recipe = await api.createRecipe(data);
    if (recipe) {
      recipes.value.unshift(recipe);
    }
    return recipe;
  };

  const updateRecipe = async (id: string, data: UpdateRecipeInput) => {
    const recipe = await api.updateRecipe(id, data);
    if (recipe) {
      const index = recipes.value.findIndex((r) => r.id === id);
      if (index !== -1) {
        recipes.value[index] = recipe;
      }
    }
    return recipe;
  };

  const deleteRecipe = async (id: string) => {
    const success = await api.deleteRecipe(id);
    if (success) {
      recipes.value = recipes.value.filter((r) => r.id !== id);
    }
    return success;
  };

  return {
    recipes,
    loading,
    fetchRecipes,
    createRecipe,
    updateRecipe,
    deleteRecipe,
  };
});
