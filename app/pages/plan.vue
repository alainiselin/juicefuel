<template>
  <DesktopShell>
    <div class="p-4 sm:p-8">
      <!-- Header with Week Navigation -->
      <div class="mb-6 sm:mb-8">
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <h1 class="text-2xl sm:text-3xl font-bold text-gray-900">Meal Planner</h1>
          
          <!-- Week Navigation -->
          <div class="flex items-center gap-3 sm:gap-4">
            <button
              @click="previousPeriod"
              class="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              :title="`Previous ${isMobile && mobileViewDays === 3 ? '3 Days' : 'Week'}`"
            >
              <svg class="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            
            <div class="text-center min-w-[160px] sm:min-w-[200px]">
              <div class="text-base sm:text-lg font-semibold text-gray-900">{{ periodLabel }}</div>
              <div class="text-xs sm:text-sm text-gray-500">{{ dateRangeLabel }}</div>
            </div>
            
            <button
              @click="nextPeriod"
              class="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              :title="`Next ${isMobile && mobileViewDays === 3 ? '3 Days' : 'Week'}`"
            >
              <svg class="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        <!-- View Controls (Mobile only) -->
        <div class="sm:hidden flex items-center justify-center gap-2">
          <button
            @click="setMobileViewDays(3)"
            class="px-3 py-1.5 text-sm rounded-lg transition-colors"
            :class="mobileViewDays === 3 ? 'bg-blue-100 text-blue-700 font-medium' : 'bg-gray-100 text-gray-700'"
          >
            3 Days
          </button>
          <button
            @click="setMobileViewDays(7)"
            class="px-3 py-1.5 text-sm rounded-lg transition-colors"
            :class="mobileViewDays === 7 ? 'bg-blue-100 text-blue-700 font-medium' : 'bg-gray-100 text-gray-700'"
          >
            7 Days
          </button>
        </div>
      </div>

      <!-- Loading Households -->
      <div v-if="loadingHouseholds" class="flex items-center justify-center py-16">
        <div class="text-center">
          <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <p class="text-gray-600">Loading...</p>
        </div>
      </div>

      <!-- No Household -->
      <div v-else-if="households.length === 0" class="max-w-md mx-auto text-center py-16">
        <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <svg class="w-12 h-12 text-yellow-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h2 class="text-xl font-semibold text-gray-900 mb-2">No Household Found</h2>
          <p class="text-gray-600 mb-4">You need to belong to a household to use the meal planner.</p>
        </div>
      </div>

      <!-- No Meal Plan -->
      <div v-else-if="!currentHousehold?.meal_plan" class="max-w-md mx-auto text-center py-16">
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <svg class="w-12 h-12 text-blue-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <h2 class="text-xl font-semibold text-gray-900 mb-2">No Meal Plan Yet</h2>
          <p class="text-gray-600 mb-4">Create a meal plan for {{ currentHousehold.name }} to get started.</p>
          <button
            @click="createMealPlan"
            class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            :disabled="creatingMealPlan"
          >
            {{ creatingMealPlan ? 'Creating...' : 'Create Meal Plan' }}
          </button>
        </div>
      </div>

      <!-- Loading Meals -->
      <div v-else-if="store.loading" class="flex items-center justify-center py-16">
        <div class="text-center">
          <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <p class="text-gray-600">Loading meals...</p>
        </div>
      </div>

      <!-- Meal Grid -->
      <div v-else>
        <WeekGridFullView
          :entries="store.entries"
          :week-start-date="weekStartDate"
          :mobile-view-days="mobileViewDays"
          @delete="deleteEntry"
          @add-meal="handleAddMealFromGrid"
        />
        
        <!-- Generator Button -->
        <div class="flex justify-center mt-8">
          <button
            @click="showGeneratorModal = true"
            class="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl"
            title="Generate meal plan suggestion"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <span class="font-medium">Generate Meal Plan</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Add Meal Dialog -->
    <!-- The dialog now adds optimistically via the meal-plan store, so we don't
         refetch here — that would race with the in-flight POST and lose the temp entry. -->
    <AddMealSlotDialog
      v-if="currentHousehold?.meal_plan"
      v-model="showAddMealDialog"
      :meal-plan-id="currentHousehold.meal_plan.id"
      :recipes="recipes"
      :default-date="defaultMealDate"
      :default-slot="defaultMealSlot"
    />

    <!-- Meal Plan Generator Modal -->
    <MealPlanGeneratorModal
      v-if="currentHousehold?.meal_plan"
      v-model="showGeneratorModal"
      :meal-plan-id="currentHousehold.meal_plan.id"
      :start-date="weekStartDate"
      @success="loadEntries"
    />
  </DesktopShell>
</template>

<script setup lang="ts">
import { useMealPlanStore } from '../stores/mealPlan';
import { useRecipesStore } from '../stores/recipes';
import { useHouseholdStore } from '../stores/household';
import type { SlotType } from '../../spec/schemas';

const store = useMealPlanStore();
const recipesStore = useRecipesStore();
const householdStore = useHouseholdStore();

// Page-local UI state (cached household state lives in the store).
const loadingHouseholds = ref(false);
const creatingMealPlan = ref(false);

// Week state
const weekStartDate = ref(new Date());
const mobileViewDays = ref(3); // Mobile: 3 or 7 days
const isMobile = ref(false);

// Slot state
const selectedSlot = ref<SlotType | 'ALL'>('ALL');

// Dialog state
const showAddMealDialog = ref(false);
const showGeneratorModal = ref(false);
const defaultMealDate = ref<string | undefined>(undefined);
const defaultMealSlot = ref<SlotType>('DINNER');

const slots = [
  { value: 'ALL' as const, label: 'Full View' },
  { value: 'BREAKFAST' as const, label: 'Breakfast' },
  { value: 'LUNCH' as const, label: 'Lunch' },
  { value: 'DINNER' as const, label: 'Dinner' },
];

const getMondayWeekStart = (date: Date) => {
  const start = new Date(date);
  const daysSinceMonday = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - daysSinceMonday);
  start.setHours(0, 0, 0, 0);
  return start;
};

const toLocalDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Computed
const currentHousehold = computed(() => householdStore.activeHousehold);
const households = computed(() => householdStore.households);

const weekEndDate = computed(() => {
  const end = new Date(weekStartDate.value);
  const days = (isMobile.value && mobileViewDays.value === 3) ? 2 : 6;
  end.setDate(end.getDate() + days);
  return end;
});

const periodLabel = computed(() => {
  const start = weekStartDate.value;
  
  if (isMobile.value && mobileViewDays.value === 3) {
    return start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  
  if (isCurrentWeek(start)) {
    return 'This Week';
  }
  
  return `Week of ${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
});

const dateRangeLabel = computed(() => {
  const start = weekStartDate.value;
  const end = weekEndDate.value;
  
  return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
});

const filteredEntries = computed(() => {
  if (selectedSlot.value === 'ALL') {
    return store.entries;
  }
  return store.entries.filter(entry => entry.slot === selectedSlot.value);
});

const recipes = computed(() => recipesStore.recipes);

// Methods
const loadHouseholds = async (options?: { silent?: boolean }) => {
  // Page-local spinner only shows when there's no cached household yet.
  const showSpinner = !options?.silent;
  if (showSpinner) loadingHouseholds.value = true;
  try {
    await householdStore.fetchHouseholds(options);
  } catch (error) {
    console.error('Failed to load households:', error);
  } finally {
    if (showSpinner) loadingHouseholds.value = false;
  }
};

const loadRecipes = async (options?: { silent?: boolean }) => {
  if (!currentHousehold.value?.recipe_libraries?.[0]?.id) return;
  await recipesStore.fetchRecipes(
    undefined,
    currentHousehold.value.recipe_libraries[0].id,
    options
  );
};

const loadEntries = async (options?: { silent?: boolean }) => {
  const household = currentHousehold.value;
  if (!household?.meal_plan) return;

  const fromDate = toLocalDateKey(weekStartDate.value);
  const toDate = toLocalDateKey(weekEndDate.value);

  await store.fetchEntries(household.meal_plan.id, fromDate, toDate, options);
};

const createMealPlan = async () => {
  if (!currentHousehold.value) return;

  creatingMealPlan.value = true;
  try {
    const mealPlan = await $fetch('/api/households/meal-plan', {
      method: 'POST',
      body: { household_id: currentHousehold.value.id },
    });

    // Patch the household in the store so UI re-renders with the new meal plan.
    householdStore.setMealPlanForActive(mealPlan);

    // Load entries for the new meal plan
    await loadEntries();
  } catch (error: any) {
    console.error('Failed to create meal plan:', error);
    alert(error?.data?.message || 'Failed to create meal plan');
  } finally {
    creatingMealPlan.value = false;
  }
};

const previousWeek = () => {
  const newDate = new Date(weekStartDate.value);
  newDate.setDate(newDate.getDate() - 7);
  weekStartDate.value = newDate;
  loadEntries();
};

const nextWeek = () => {
  const newDate = new Date(weekStartDate.value);
  newDate.setDate(newDate.getDate() + 7);
  weekStartDate.value = newDate;
  loadEntries();
};

const previousPeriod = () => {
  const newDate = new Date(weekStartDate.value);
  const days = (isMobile.value && mobileViewDays.value === 3) ? 3 : 7;
  newDate.setDate(newDate.getDate() - days);
  weekStartDate.value = newDate;
  loadEntries();
};

const nextPeriod = () => {
  const newDate = new Date(weekStartDate.value);
  const days = (isMobile.value && mobileViewDays.value === 3) ? 3 : 7;
  newDate.setDate(newDate.getDate() + days);
  weekStartDate.value = newDate;
  loadEntries();
};

const setMobileViewDays = (days: number) => {
  mobileViewDays.value = days;
  // Reset to a week start when changing views
  weekStartDate.value = getMondayWeekStart(new Date());
  loadEntries();
};

const isCurrentWeek = (date: Date) => {
  const todayWeekStart = getMondayWeekStart(new Date());
  
  const compareDate = new Date(date);
  compareDate.setHours(0, 0, 0, 0);
  
  return compareDate.getTime() === todayWeekStart.getTime();
};

const deleteEntry = async (id: string) => {
  await store.deleteEntry(id);
};

const handleAddMealFromGrid = (date: string, slot: SlotType) => {
  defaultMealDate.value = date;
  defaultMealSlot.value = slot;
  showAddMealDialog.value = true;
};

// Update default slot when tab changes or add button clicked
watch(selectedSlot, (newSlot) => {
  if (newSlot !== 'ALL') {
    defaultMealSlot.value = newSlot as SlotType;
  } else {
    defaultMealSlot.value = 'DINNER';
  }
  defaultMealDate.value = undefined; // Reset date when changing tabs
});

// Initialize — stale-while-revalidate so revisiting the page renders cached data
// immediately and refreshes silently in the background.
onMounted(() => {
  isMobile.value = window.innerWidth < 640;
  window.addEventListener('resize', () => {
    isMobile.value = window.innerWidth < 640;
  });

  weekStartDate.value = getMondayWeekStart(new Date());

  const hasCachedHousehold = householdStore.activeHousehold !== null;
  const hasCachedRecipes = recipesStore.recipes.length > 0;
  const hasCachedEntries = store.entries.length > 0;

  if (hasCachedHousehold) {
    // Warm visit: we already know which household + meal_plan to fetch for, so fire
    // all three refreshes in parallel instead of making entries wait for households.
    void loadHouseholds({ silent: true });
    void loadRecipes({ silent: hasCachedRecipes });
    void loadEntries({ silent: hasCachedEntries });
  } else {
    // Cold start: must resolve households first to learn the meal_plan id.
    void (async () => {
      await loadHouseholds();
      await Promise.all([loadRecipes(), loadEntries()]);
    })();
  }
});
</script>
