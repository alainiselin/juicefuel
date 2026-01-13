<template>
  <div 
    @click="onCardClick"
    @touchstart="onTouchStart"
    @touchmove="onTouchMove"
    @touchend="onTouchEnd"
    @touchcancel="onTouchCancel"
    @mousedown="onMouseDown"
    @mouseup="onMouseUp"
    @mouseleave="onMouseLeave"
    class="bg-white border border-gray-200 rounded-lg p-2 hover:border-blue-300 transition-colors relative group aspect-square flex flex-col cursor-pointer"
    :class="[
      item.is_checked 
        ? 'opacity-50 border-gray-300' 
        : '',
      isLongPressing ? 'ring-2 ring-blue-400' : ''
    ]"
  >
    <!-- Kebab Menu Button (desktop, top-right) -->
    <button
      @click.stop="$emit('openDetail')"
      class="absolute top-1 right-1 w-5 h-5 rounded-full bg-gray-50 text-gray-600 hover:bg-gray-100 opacity-0 sm:group-hover:opacity-100 transition-opacity flex items-center justify-center"
      title="Edit details"
    >
      <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 16 16">
        <circle cx="8" cy="3" r="1.5"/>
        <circle cx="8" cy="8" r="1.5"/>
        <circle cx="8" cy="13" r="1.5"/>
      </svg>
    </button>

    <!-- Item Name -->
    <div 
      class="font-semibold text-gray-900 mb-1 pr-5 text-xs leading-tight"
      :class="{ 'line-through': item.is_checked }"
    >
      {{ item.ingredient?.name || item.article?.name || 'Unknown' }}
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
        @click.stop
        type="number"
        step="0.1"
        min="0.01"
        class="w-12 px-1 py-0.5 text-sm border border-blue-500 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
      <button
        v-else-if="item.quantity"
        @click.stop="startEditQuantity"
        class="text-lg font-bold hover:text-blue-700"
        :class="item.is_checked ? 'text-gray-500' : 'text-blue-600'"
        :disabled="item.is_checked"
      >
        {{ displayQuantity }}
      </button>

      <select
        v-if="editing === 'unit'"
        ref="unitSelect"
        v-model="editUnit"
        @blur="saveUnit"
        @keydown.esc="cancelEdit"
        @click.stop
        class="px-1 py-0.5 text-xs border border-blue-500 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
      >
        <option value="">-</option>
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
        v-else-if="item.quantity || item.unit"
        @click.stop="startEditUnit"
        class="text-xs text-gray-700 hover:text-blue-600"
        :disabled="item.is_checked"
      >
        {{ displayUnit }}
      </button>
    </div>

    <!-- Note (Editable) -->
    <div class="mt-auto">
      <div v-if="editing === 'note' || item.note">
        <input
          v-if="editing === 'note'"
          ref="noteInput"
          v-model="editNote"
          @blur="saveNote"
          @keypress.enter="saveNote"
          @keydown.esc="cancelEdit"
          @click.stop
          placeholder="note..."
          class="w-full px-1 py-0.5 text-[10px] border border-blue-500 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <button
          v-else-if="item.note"
          @click.stop="startEditNote"
          class="text-[10px] text-gray-600 italic hover:text-blue-600 truncate block w-full text-left"
        >
          {{ item.note }}
        </button>
      </div>
      
      <button
        v-if="!editing && !item.note"
        @click.stop="startEditNote"
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
import { nextTick } from 'vue';
import { formatQuantity, formatUnit } from '../../utils/ingredientFormatting';
import type { ShoppingListItemDetail } from '../../../spec/schemas';

const props = defineProps<{
  item: ShoppingListItemDetail;
}>();

const emit = defineEmits<{
  toggleChecked: [itemId: string, isChecked: boolean];
  updated: [item: ShoppingListItemDetail];
  delete: [];
  openDetail: [];
}>();

const editing = ref<'quantity' | 'unit' | 'note' | null>(null);
const editQuantity = ref(0);
const editUnit = ref('');
const editNote = ref('');
const saving = ref(false);

const quantityInput = ref<HTMLInputElement | null>(null);
const unitSelect = ref<HTMLSelectElement | null>(null);
const noteInput = ref<HTMLInputElement | null>(null);

const displayQuantity = computed(() => formatQuantity(props.item.quantity));
const displayUnit = computed(() => formatUnit(props.item.unit));

// Long-press detection
const isLongPressing = ref(false);
let longPressTimer: ReturnType<typeof setTimeout> | null = null;
let touchStartX = 0;
let touchStartY = 0;
const LONG_PRESS_DURATION = 400; // ms
const MOVEMENT_THRESHOLD = 10; // px

function onTouchStart(event: TouchEvent) {
  if (editing.value) return;
  
  const touch = event.touches[0];
  touchStartX = touch.clientX;
  touchStartY = touch.clientY;
  
  isLongPressing.value = false;
  longPressTimer = setTimeout(() => {
    isLongPressing.value = true;
    emit('openDetail');
    // Haptic feedback on mobile
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
  }, LONG_PRESS_DURATION);
}

function onTouchMove(event: TouchEvent) {
  if (!longPressTimer) return;
  
  const touch = event.touches[0];
  const deltaX = Math.abs(touch.clientX - touchStartX);
  const deltaY = Math.abs(touch.clientY - touchStartY);
  
  // Cancel long-press if user moved too much (scrolling)
  if (deltaX > MOVEMENT_THRESHOLD || deltaY > MOVEMENT_THRESHOLD) {
    cancelLongPress();
  }
}

function onTouchEnd() {
  if (isLongPressing.value) {
    // Long-press was triggered, don't toggle checked
    isLongPressing.value = false;
  }
  cancelLongPress();
}

function onTouchCancel() {
  cancelLongPress();
}

// Mouse events for testing on desktop
function onMouseDown() {
  if (editing.value) return;
  if (window.innerWidth >= 640) return; // Only on mobile viewport
  
  isLongPressing.value = false;
  longPressTimer = setTimeout(() => {
    isLongPressing.value = true;
    emit('openDetail');
  }, LONG_PRESS_DURATION);
}

function onMouseUp() {
  if (isLongPressing.value) {
    isLongPressing.value = false;
  }
  cancelLongPress();
}

function onMouseLeave() {
  cancelLongPress();
}

function cancelLongPress() {
  if (longPressTimer) {
    clearTimeout(longPressTimer);
    longPressTimer = null;
  }
  isLongPressing.value = false;
}

// Card click handler - toggle checked only if not clicking interactive elements
function onCardClick(event: MouseEvent) {
  // Don't toggle if long-press was triggered
  if (isLongPressing.value) {
    isLongPressing.value = false;
    return;
  }
  
  // Don't toggle if editing or clicking interactive elements
  if (editing.value) return;
  const target = event.target as HTMLElement;
  if (target.tagName === 'BUTTON') return;
  if (target.tagName === 'INPUT') return;
  if (target.tagName === 'SELECT') return;
  
  toggleChecked();
}

function toggleChecked() {
  emit('toggleChecked', props.item.id, !props.item.is_checked);
}

function startEditQuantity() {
  if (props.item.is_checked) return;
  editing.value = 'quantity';
  editQuantity.value = props.item.quantity || 1;
  nextTick(() => quantityInput.value?.focus());
}

function startEditUnit() {
  if (props.item.is_checked) return;
  editing.value = 'unit';
  editUnit.value = props.item.unit || '';
  nextTick(() => unitSelect.value?.focus());
}

function startEditNote() {
  editing.value = 'note';
  editNote.value = props.item.note || '';
  nextTick(() => noteInput.value?.focus());
}

async function saveQuantity() {
  if (editQuantity.value <= 0) {
    cancelEdit();
    return;
  }
  
  await updateItem({ quantity: editQuantity.value });
  editing.value = null;
}

async function saveUnit() {
  await updateItem({ unit: editUnit.value || null });
  editing.value = null;
}

async function saveNote() {
  await updateItem({ note: editNote.value || null });
  editing.value = null;
}

function cancelEdit() {
  editing.value = null;
}

async function updateItem(updates: any) {
  saving.value = true;
  try {
    const updated = await $fetch(`/api/shopping-list-items/${props.item.id}`, {
      method: 'PATCH',
      body: updates,
    });
    emit('updated', updated as ShoppingListItemDetail);
  } catch (error: any) {
    console.error('Failed to update item:', error);
    alert(error?.data?.message || 'Failed to update item');
  } finally {
    saving.value = false;
  }
}
</script>
