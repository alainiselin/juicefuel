<template>
  <div class="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
    <!-- Week Grid -->
    <div class="grid gap-1 sm:gap-2" :style="gridStyle">
      <!-- Header Row: Day Labels -->
      <div class="col-start-1 row-start-1"></div> <!-- Empty corner cell -->
      <div
        v-for="(day, index) in visibleDays"
        :key="day.date"
        :class="['text-center py-2 sm:py-3 font-semibold text-gray-700 border-b-2 border-gray-200', getDayClass(day)]"
        :style="`grid-column: ${index + 2}; grid-row: 1;`"
      >
        <div class="text-xs sm:text-base">{{ day.dayLabel }}</div>
        <div class="text-xs font-normal text-gray-500">{{ day.dateLabel }}</div>
      </div>

      <!-- Row Labels: Breakfast, Lunch, Dinner -->
      <div
        v-for="(slot, rowIndex) in slots"
        :key="slot.value"
        class="flex items-center justify-end pr-2 sm:pr-4 text-xs sm:text-base font-medium text-gray-700 border-r-2 border-gray-200"
        :style="`grid-column: 1; grid-row: ${rowIndex + 2};`"
      >
        <span class="hidden sm:inline">{{ slot.label }}</span>
        <span class="sm:hidden">{{ slot.label.substring(0, 1) }}</span>
      </div>

      <!-- Grid Cells: Meals -->
      <template v-for="(day, colIndex) in visibleDays" :key="`${day.date}-cells`">
        <!-- Breakfast -->
        <div
          class="border border-gray-200 bg-white rounded-lg p-1 sm:p-2 aspect-square flex flex-col"
          :style="`grid-column: ${colIndex + 2}; grid-row: 2;`"
        >
          <div class="flex flex-col gap-1 sm:gap-2 h-full overflow-hidden">
            <MealCard
              v-for="entry in getMealsForDaySlot(day.date, 'BREAKFAST')"
              :key="entry.id"
              :entry="entry"
              :compact="true"
              @delete="$emit('delete', entry.id)"
            />
            <button
              v-if="getMealsForDaySlot(day.date, 'BREAKFAST').length === 0"
              @click="handleAddMeal(day.date, 'BREAKFAST')"
              class="flex-1 min-h-[60px] border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors text-gray-400 hover:text-blue-600 flex items-center justify-center"
            >
              <svg class="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Lunch -->
        <div
          class="border border-gray-200 bg-white rounded-lg p-1 sm:p-2 aspect-square flex flex-col"
          :style="`grid-column: ${colIndex + 2}; grid-row: 3;`"
        >
          <div class="flex flex-col gap-1 sm:gap-2 h-full overflow-hidden">
            <MealCard
              v-for="entry in getMealsForDaySlot(day.date, 'LUNCH')"
              :key="entry.id"
              :entry="entry"
              :compact="true"
              @delete="$emit('delete', entry.id)"
            />
            <button
              v-if="getMealsForDaySlot(day.date, 'LUNCH').length === 0"
              @click="handleAddMeal(day.date, 'LUNCH')"
              class="flex-1 min-h-[60px] border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors text-gray-400 hover:text-blue-600 flex items-center justify-center"
            >
              <svg class="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Dinner -->
        <div
          class="border border-gray-200 bg-white rounded-lg p-1 sm:p-2 aspect-square flex flex-col"
          :style="`grid-column: ${colIndex + 2}; grid-row: 4;`"
        >
          <div class="flex flex-col gap-1 sm:gap-2 h-full overflow-hidden">
            <MealCard
              v-for="entry in getMealsForDaySlot(day.date, 'DINNER')"
              :key="entry.id"
              :entry="entry"
              :compact="true"
              @delete="$emit('delete', entry.id)"
            />
            <button
              v-if="getMealsForDaySlot(day.date, 'DINNER').length === 0"
              @click="handleAddMeal(day.date, 'DINNER')"
              class="flex-1 min-h-[60px] border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors text-gray-400 hover:text-blue-600 flex items-center justify-center"
            >
              <svg class="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { MealPlanEntry, SlotType } from '../../../spec/schemas';

interface WeekDay {
  date: string; // ISO date string
  dayLabel: string; // e.g., "Mon"
  dateLabel: string; // e.g., "Dec 30"
  isToday: boolean;
}

const props = withDefaults(defineProps<{
  entries: MealPlanEntry[];
  weekStartDate: Date;
  mobileViewDays?: number;
}>(), {
  mobileViewDays: 3,
});

const emit = defineEmits<{
  delete: [id: string];
  addMeal: [date: string, slot: SlotType];
}>();

const slots = [
  { value: 'BREAKFAST' as const, label: 'Breakfast' },
  { value: 'LUNCH' as const, label: 'Lunch' },
  { value: 'DINNER' as const, label: 'Dinner' },
];

// Compute full week days
const weekDays = computed((): WeekDay[] => {
  const days: WeekDay[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(props.weekStartDate);
    date.setDate(date.getDate() + i);
    date.setHours(0, 0, 0, 0);
    
    const isToday = date.getTime() === today.getTime();
    
    days.push({
      date: date.toISOString().split('T')[0],
      dayLabel: date.toLocaleDateString('en-US', { weekday: 'short' }),
      dateLabel: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      isToday,
    });
  }
  
  return days;
});

// Visible days based on screen size and mobile setting
const visibleDays = computed(() => {
  // On mobile, show only mobileViewDays (3 or 7)
  if (typeof window !== 'undefined' && window.innerWidth < 640) {
    return weekDays.value.slice(0, props.mobileViewDays);
  }
  // Desktop always shows full week
  return weekDays.value;
});

// Grid style - responsive columns
const gridStyle = computed(() => {
  const dayCount = visibleDays.value.length;
  return {
    'grid-template-columns': `auto repeat(${dayCount}, minmax(0, 1fr))`,
    'grid-template-rows': 'auto repeat(3, minmax(80px, auto))',
  };
});

// Build lookup structure: mealsByDaySlot[dateKey][slot] = MealPlanEntry[]
const mealsByDaySlot = computed(() => {
  const lookup: Record<string, Record<string, MealPlanEntry[]>> = {};
  
  for (const entry of props.entries) {
    const dateKey = new Date(entry.date).toISOString().split('T')[0];
    if (!lookup[dateKey]) {
      lookup[dateKey] = {};
    }
    if (!lookup[dateKey][entry.slot]) {
      lookup[dateKey][entry.slot] = [];
    }
    lookup[dateKey][entry.slot].push(entry);
  }
  
  return lookup;
});

const getMealsForDaySlot = (dateKey: string, slot: SlotType): MealPlanEntry[] => {
  return mealsByDaySlot.value[dateKey]?.[slot] || [];
};

const getDayClass = (day: WeekDay) => {
  return day.isToday ? 'bg-blue-50 text-blue-700' : '';
};

const handleAddMeal = (date: string, slot: SlotType) => {
  emit('addMeal', date, slot);
};
</script>
