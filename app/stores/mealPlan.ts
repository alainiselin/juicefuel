import { defineStore } from 'pinia';
import type { MealPlanEntry, CreateMealPlanEntryInput } from '../../spec/schemas';

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

  const createEntry = async (data: CreateMealPlanEntryInput) => {
    const entry = await api.createMealPlanEntry(data);
    if (entry) {
      entries.value.push(entry);
    }
    return entry;
  };

  const deleteEntry = async (id: string) => {
    const success = await api.deleteMealPlanEntry(id);
    if (success) {
      entries.value = entries.value.filter((e) => e.id !== id);
    }
    return success;
  };

  return {
    entries,
    loading,
    fetchEntries,
    createEntry,
    deleteEntry,
  };
});
