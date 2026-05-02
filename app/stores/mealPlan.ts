import { defineStore } from 'pinia';
import type { MealPlanEntry, CreateMealPlanEntryInput, Recipe } from '../../spec/schemas';

export const useMealPlanStore = defineStore('mealPlan', () => {
  const entries = ref<MealPlanEntry[]>([]);
  const loading = ref(false);
  const api = useApi();

  const fetchEntries = async (
    mealPlanId: string,
    from: string,
    to: string,
    options?: { silent?: boolean }
  ) => {
    // SWR: when called silently, leave the spinner alone so cached entries stay visible.
    if (!options?.silent) loading.value = true;
    try {
      entries.value = await api.getMealPlan(mealPlanId, from, to);
    } finally {
      if (!options?.silent) loading.value = false;
    }
  };

  /**
   * Optimistic create. Pushes a temp entry into the store synchronously and fires the
   * POST in the background, then replaces the temp with the real entry on success or
   * removes it on failure. The optional `optimisticRecipe` lets callers render the
   * recipe-backed card immediately with full data.
   */
  const createEntry = (
    data: CreateMealPlanEntryInput,
    optimisticRecipe?: Recipe | null
  ): Promise<MealPlanEntry | null> => {
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const tempEntry: MealPlanEntry = {
      id: tempId,
      meal_plan_id: data.meal_plan_id,
      date: data.date,
      slot: data.slot,
      recipe_id: data.recipe_id ?? null,
      title: data.title ?? null,
      recipe: optimisticRecipe ?? null,
    };
    entries.value.push(tempEntry);

    return (async () => {
      try {
        const real = await api.createMealPlanEntry(data);
        if (!real) throw new Error('Create failed');
        const idx = entries.value.findIndex((e) => e.id === tempId);
        if (idx !== -1) {
          // Temp still there — swap with the server's real entry.
          entries.value[idx] = real;
        } else {
          // User deleted the temp card before the POST returned. Clean up server-side
          // so the meal plan stays consistent with what the user sees.
          void api.deleteMealPlanEntry(real.id);
        }
        return real;
      } catch (error) {
        entries.value = entries.value.filter((e) => e.id !== tempId);
        throw error;
      }
    })();
  };

  /**
   * Optimistic delete. Removes the entry from the store synchronously and fires the
   * DELETE in the background, restoring it on failure.
   */
  const deleteEntry = (id: string): Promise<boolean> => {
    if (id.startsWith('temp-')) {
      // Never persisted — just drop locally.
      entries.value = entries.value.filter((e) => e.id !== id);
      return Promise.resolve(true);
    }

    const previous = entries.value.slice();
    entries.value = entries.value.filter((e) => e.id !== id);

    return (async () => {
      const success = await api.deleteMealPlanEntry(id);
      if (!success) {
        entries.value = previous;
        return false;
      }
      return true;
    })();
  };

  return {
    entries,
    loading,
    fetchEntries,
    createEntry,
    deleteEntry,
  };
});
