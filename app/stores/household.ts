import { defineStore } from 'pinia';

interface MealPlanRef {
  id: string;
  household_id: string;
  created_at?: string;
  updated_at?: string;
}

interface RecipeLibraryRef {
  id: string;
  name: string;
}

interface Household {
  id: string;
  name: string;
  meal_plan: MealPlanRef | null;
  recipe_libraries: RecipeLibraryRef[];
  userRole?: string;
}

interface ActiveResponse {
  household: { id: string; name: string };
}

export const useHouseholdStore = defineStore('household', () => {
  const households = ref<Household[]>([]);
  const activeHouseholdId = ref<string | null>(null);
  const loading = ref(false);

  const activeHousehold = computed<Household | null>(() => {
    if (households.value.length === 0) return null;
    if (activeHouseholdId.value) {
      const match = households.value.find((h) => h.id === activeHouseholdId.value);
      if (match) return match;
    }
    return households.value[0] ?? null;
  });

  const fetchHouseholds = async (options?: { silent?: boolean }) => {
    if (!options?.silent) loading.value = true;
    try {
      const [active, all] = await Promise.all([
        $fetch<ActiveResponse>('/api/households/me'),
        $fetch<Household[]>('/api/households'),
      ]);
      households.value = all;
      activeHouseholdId.value = active.household.id;
    } finally {
      if (!options?.silent) loading.value = false;
    }
  };

  /// Update the active household's meal_plan ref in place — used after the user
  /// creates a meal plan from the planner page.
  const setMealPlanForActive = (mealPlan: MealPlanRef) => {
    const id = activeHouseholdId.value;
    if (!id) return;
    const idx = households.value.findIndex((h) => h.id === id);
    if (idx !== -1) {
      households.value[idx] = { ...households.value[idx], meal_plan: mealPlan };
    }
  };

  return {
    households,
    activeHouseholdId,
    activeHousehold,
    loading,
    fetchHouseholds,
    setMealPlanForActive,
  };
});
