<template>
  <div
    v-if="modelValue"
    class="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50"
    @click.self="$emit('update:modelValue', false)"
  >
    <div
      class="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto shadow-xl"
    >
      <!-- Header -->
      <div class="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <h2 class="text-xl font-bold text-gray-900">Generate Shopping List</h2>
        <button
          @click="$emit('update:modelValue', false)"
          class="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Close"
        >
          <X :size="18" class="text-gray-500" />
        </button>
      </div>

      <!-- Content -->
      <div class="p-6 space-y-5">
        <p class="text-sm text-gray-600">
          Add ingredients from your planned meals to a shopping list.
        </p>

        <p
          v-if="!mealPlanId"
          class="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800"
        >
          You don't have a meal plan yet. Create one on the Plan page to use this feature.
        </p>

        <!-- Target list picker -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Add to list
          </label>
          <select
            v-model="targetListId"
            class="w-full rounded-lg border border-gray-300 px-3 py-2 text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
          >
            <option v-for="list in lists" :key="list.id" :value="list.id">
              {{ list.title }}
            </option>
          </select>
        </div>

        <!-- Days slider -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Days ahead: <span class="font-semibold">{{ days }}</span>
          </label>
          <input
            v-model.number="days"
            type="range"
            min="1"
            max="14"
            class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
          <div class="flex justify-between text-xs text-gray-500 mt-1">
            <span>1 day</span>
            <span>14 days</span>
          </div>
          <p class="mt-2 text-xs text-gray-500">
            From <span class="font-medium">{{ formatDate(fromDate) }}</span>
            to <span class="font-medium">{{ formatDate(toDate) }}</span>
          </p>
        </div>

        <!-- Error -->
        <p v-if="error" class="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {{ error }}
        </p>

        <!-- Result summary -->
        <p v-if="lastResult" class="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Added {{ lastResult.added }} new item{{ lastResult.added === 1 ? '' : 's' }},
          merged {{ lastResult.merged }} existing.
        </p>
      </div>

      <!-- Footer -->
      <div class="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-end gap-2">
        <button
          @click="$emit('update:modelValue', false)"
          class="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
        >
          Close
        </button>
        <button
          :disabled="!canSubmit || submitting"
          @click="submit"
          class="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Sparkles :size="18" />
          {{ submitting ? 'Generating…' : 'Generate' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Sparkles, X } from 'lucide-vue-next';
import type { ShoppingListDetail } from '../../../spec/schemas';

interface Props {
  modelValue: boolean;
  lists: ShoppingListDetail[];
  defaultListId: string;
  mealPlanId: string | null;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void;
  (e: 'generated', listId: string): void;
}>();

const targetListId = ref(props.defaultListId);
const days = ref(7);
const submitting = ref(false);
const error = ref('');
const lastResult = ref<{ added: number; merged: number } | null>(null);

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      targetListId.value = props.defaultListId || props.lists[0]?.id || '';
      days.value = 7;
      error.value = '';
      lastResult.value = null;
    }
  }
);

const fromDate = computed(() => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
});

const toDate = computed(() => {
  const d = new Date(fromDate.value);
  d.setDate(d.getDate() + days.value - 1);
  return d;
});

const canSubmit = computed(() => !!targetListId.value && !!props.mealPlanId && days.value >= 1);

function toLocalDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

async function submit() {
  if (!canSubmit.value || !props.mealPlanId) return;
  submitting.value = true;
  error.value = '';
  lastResult.value = null;
  try {
    const result = await $fetch<{ added: number; merged: number; list: ShoppingListDetail }>(
      `/api/shopping-list/${targetListId.value}/generate-from-meal-plan`,
      {
        method: 'POST',
        body: {
          meal_plan_id: props.mealPlanId,
          from: toLocalDateKey(fromDate.value),
          to: toLocalDateKey(toDate.value),
        },
      }
    );
    lastResult.value = { added: result.added, merged: result.merged };
    emit('generated', targetListId.value);
  } catch (e: any) {
    error.value = e?.data?.message || e?.message || 'Failed to generate.';
  } finally {
    submitting.value = false;
  }
}
</script>
