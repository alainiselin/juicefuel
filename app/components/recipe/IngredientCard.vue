<template>
  <div class="bg-white border border-gray-200 rounded-lg p-2 hover:border-blue-300 transition-colors relative group aspect-square flex flex-col">
    <!-- Remove Button -->
    <button
      @click="$emit('remove')"
      class="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-50 text-red-600 hover:bg-red-100 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
      title="Remove ingredient"
    >
      <svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>

    <!-- Ingredient Name -->
    <div class="font-semibold text-gray-900 mb-1 pr-5 text-xs leading-tight">
      {{ ingredient.ingredient.canonical_name || ingredient.ingredient.name }}
    </div>

    <!-- Quantity & Unit (Editable) -->
    <div class="flex items-baseline gap-1 mb-0.5">
      <input
        v-if="editing === 'quantity'"
        ref="quantityInput"
        v-model.number="editQuantity"
        @blur="saveQuantity"
        @keypress.enter="saveQuantity"
        @keydown.esc="cancelEdit"
        type="number"
        step="0.1"
        min="0.01"
        class="w-12 px-1 py-0.5 text-sm border border-blue-500 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
      <button
        v-else
        @click="startEditQuantity"
        class="text-lg font-bold text-blue-600 hover:text-blue-700"
      >
        {{ displayQuantity }}
      </button>

      <select
        v-if="editing === 'unit'"
        ref="unitSelect"
        v-model="editUnit"
        @blur="saveUnit"
        @keydown.esc="cancelEdit"
        class="px-1 py-0.5 text-xs border border-blue-500 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
      >
        <option value="G">g</option>
        <option value="KG">kg</option>
        <option value="ML">ml</option>
        <option value="L">L</option>
        <option value="TBSP">tbsp</option>
        <option value="TSP">tsp</option>
        <option value="CUP">cup</option>
        <option value="PIECE">piece</option>
        <option value="PACKAGE">package</option>
      </select>
      <button
        v-else
        @click="startEditUnit"
        class="text-xs text-gray-700 hover:text-blue-600"
      >
        {{ formatUnit(ingredient.unit) }}
      </button>
    </div>

    <!-- Base Amount (subtle, only if scaled) -->
    <div v-if="isScaled" class="text-[10px] text-gray-500 mb-0.5">
      ({{ formatQuantity(ingredient.quantity) }} {{ formatUnit(ingredient.unit) }})
    </div>

    <!-- Note (Editable) -->
    <div class="mt-auto">
      <div v-if="editing === 'note' || ingredient.note">
        <input
          v-if="editing === 'note'"
          ref="noteInput"
          v-model="editNote"
          @blur="saveNote"
          @keypress.enter="saveNote"
          @keydown.esc="cancelEdit"
          placeholder="note..."
          class="w-full px-1 py-0.5 text-[10px] border border-blue-500 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <button
          v-else-if="ingredient.note"
          @click="startEditNote"
          class="text-[10px] text-gray-600 italic hover:text-blue-600 truncate block w-full text-left"
        >
          {{ ingredient.note }}
        </button>
      </div>
      
      <button
        v-if="!editing && !ingredient.note"
        @click="startEditNote"
        class="text-[10px] text-gray-400 hover:text-blue-600"
      >
        + note
      </button>
    </div>

    <!-- Saving Indicator -->
    <div v-if="saving" class="absolute bottom-1 right-1">
      <div class="animate-spin rounded-full h-2.5 w-2.5 border-b-2 border-blue-600"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { nextTick } from "vue";
import { formatQuantity, formatUnit } from '../../utils/ingredientFormatting';

// Scaling logic:
// displayQuantity = baseQuantity * (currentServings / baseServings)
// Example: base=200g, baseServings=4, currentServings=8 → display=400g

const props = defineProps<{
  ingredient: any;
  recipeId: string;
  baseServings: number;
  currentServings: number;
}>();

const emit = defineEmits<{
  updated: [ingredient: any];
  remove: [];
}>();

const editing = ref<'quantity' | 'unit' | 'note' | null>(null);
const editQuantity = ref(0);
const editUnit = ref('');
const editNote = ref('');
const saving = ref(false);

const quantityInput = ref<HTMLInputElement | null>(null);
const unitSelect = ref<HTMLSelectElement | null>(null);
const noteInput = ref<HTMLInputElement | null>(null);

const scalingRatio = computed(() => props.currentServings / props.baseServings);
const displayQuantity = computed(() => formatQuantity(props.ingredient.quantity * scalingRatio.value));
const isScaled = computed(() => props.currentServings !== props.baseServings);

function startEditQuantity() {
  editing.value = 'quantity';
  editQuantity.value = props.ingredient.quantity;
  nextTick(() => quantityInput.value?.focus());
}

function startEditUnit() {
  editing.value = 'unit';
  editUnit.value = props.ingredient.unit;
  nextTick(() => unitSelect.value?.focus());
}

function startEditNote() {
  editing.value = 'note';
  editNote.value = props.ingredient.note || '';
  nextTick(() => noteInput.value?.focus());
}

async function saveQuantity() {
  if (editQuantity.value <= 0) {
    cancelEdit();
    return;
  }
  
  await updateIngredient({ quantity: editQuantity.value });
  editing.value = null;
}

async function saveUnit() {
  await updateIngredient({ unit: editUnit.value });
  editing.value = null;
}

async function saveNote() {
  await updateIngredient({ note: editNote.value || null });
  editing.value = null;
}

function cancelEdit() {
  editing.value = null;
}

async function updateIngredient(updates: any) {
  saving.value = true;
  try {
    const recipeIngredientId = `${props.ingredient.recipe_id}-${props.ingredient.ingredient_id}`;
    const updated = await $fetch(`/api/recipes/${props.recipeId}/ingredients/${recipeIngredientId}`, {
      method: 'PATCH',
      body: updates,
    });
    emit('updated', updated);
  } catch (error: any) {
    console.error('Failed to update ingredient:', error);
    alert(error?.data?.message || 'Failed to update ingredient');
  } finally {
    saving.value = false;
  }
}
</script>
