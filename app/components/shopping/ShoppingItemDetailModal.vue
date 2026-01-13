<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="modelValue"
        class="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center"
        @click="handleBackdropClick"
      >
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/50"></div>

        <!-- Modal Content -->
        <div
          ref="modalContent"
          class="relative bg-white w-full sm:max-w-md sm:rounded-lg overflow-hidden"
          :class="[
            isMobile ? 'rounded-t-2xl max-h-[85vh]' : 'rounded-lg'
          ]"
          @click.stop
        >
          <!-- Handle (mobile only) -->
          <div v-if="isMobile" class="flex justify-center pt-2 pb-1">
            <div class="w-12 h-1 bg-gray-300 rounded-full"></div>
          </div>

          <!-- Header -->
          <div class="px-4 py-3 border-b border-gray-200">
            <h3 class="text-lg font-semibold text-gray-900">
              {{ item.ingredient?.name || item.article?.name || 'Unknown' }}
            </h3>
          </div>

          <!-- Body -->
          <div class="p-4 space-y-6">
            <!-- Quantity -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Quantity
              </label>
              <div class="flex items-center gap-2">
                <!-- Quick quantity buttons -->
                <div class="flex gap-1">
                  <button
                    v-for="q in quickQuantities"
                    :key="q"
                    @click="localQuantity = q"
                    class="px-3 py-1.5 text-sm rounded border transition-colors"
                    :class="[
                      localQuantity === q
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-blue-500'
                    ]"
                  >
                    {{ q }}
                  </button>
                </div>
                <!-- Custom input -->
                <input
                  v-model.number="localQuantity"
                  type="number"
                  step="0.1"
                  min="0.01"
                  class="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <!-- Unit -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Unit
              </label>
              <select
                v-model="localUnit"
                class="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="G">Grams (g)</option>
                <option value="KG">Kilograms (kg)</option>
                <option value="ML">Milliliters (ml)</option>
                <option value="L">Liters (L)</option>
                <option value="TBSP">Tablespoon (tbsp)</option>
                <option value="TSP">Teaspoon (tsp)</option>
                <option value="CUP">Cup</option>
                <option value="PIECE">Piece</option>
                <option value="PACKAGE">Package</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <!-- Note -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Note
              </label>
              <input
                v-model="localNote"
                type="text"
                placeholder="Add a note..."
                class="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <!-- Aisle (for articles only) -->
            <div v-if="item.article_id">
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Aisle / Category
              </label>
              <select
                v-model="localAisle"
                class="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="fruits-vegetables">Fruits & Vegetables</option>
                <option value="bread-pastries">Bread & Pastries</option>
                <option value="milk-cheese">Milk & Cheese</option>
                <option value="meat-fish">Meat & Fish</option>
                <option value="ingredients-spices">Ingredients & Spices</option>
                <option value="grain-products">Grain Products</option>
                <option value="frozen-convenience">Frozen & Convenience</option>
                <option value="snacks-sweets">Snacks & Sweets</option>
                <option value="beverages">Beverages</option>
                <option value="household">Household</option>
                <option value="care-health">Care & Health</option>
                <option value="pet-supplies">Pet Supplies</option>
                <option value="home-garden">Home & Garden</option>
                <option value="own-items">Own Items</option>
              </select>
            </div>

            <!-- Delete Button -->
            <button
              @click="handleDelete"
              class="w-full px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded hover:bg-red-100 transition-colors"
            >
              Remove from list
            </button>
          </div>

          <!-- Footer -->
          <div class="px-4 py-3 border-t border-gray-200 bg-gray-50">
            <button
              @click="handleSave"
              :disabled="saving"
              class="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {{ saving ? 'Saving...' : 'Done' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import type { ShoppingListItemDetail } from '../../../spec/schemas';

const props = defineProps<{
  modelValue: boolean;
  item: ShoppingListItemDetail;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  updated: [item: ShoppingListItemDetail, aisleChanged?: boolean];
  delete: [];
}>();

const localQuantity = ref(props.item.quantity || 1);
const localUnit = ref(props.item.unit || 'PIECE');
const localNote = ref(props.item.note || '');
const localAisle = ref(props.item.article?.default_aisle || 'own-items');
const saving = ref(false);

const modalContent = ref<HTMLElement | null>(null);

// Quick quantity options based on unit
const quickQuantities = computed(() => {
  const unit = localUnit.value;
  // For grams and milliliters, use larger quantities
  if (['G', 'ML'].includes(unit)) {
    return [100, 200, 300, 500];
  }
  // For all other units (PIECE, PACKAGE, KG, L, etc.), use smaller quantities
  return [1, 2, 3, 5];
});

// Detect mobile
const isMobile = ref(false);
onMounted(() => {
  isMobile.value = window.innerWidth < 640;
  const handleResize = () => {
    isMobile.value = window.innerWidth < 640;
  };
  window.addEventListener('resize', handleResize);
  onUnmounted(() => window.removeEventListener('resize', handleResize));
});

// Reset local state when item changes
watch(() => props.item, (newItem) => {
  localQuantity.value = newItem.quantity || 1;
  localUnit.value = newItem.unit || 'PIECE';
  localNote.value = newItem.note || '';
  localAisle.value = newItem.article?.default_aisle || 'own-items';
}, { immediate: true });

function handleBackdropClick() {
  emit('update:modelValue', false);
}

async function handleSave() {
  saving.value = true;
  try {
    // Update shopping list item (quantity, unit, note)
    const updated = await $fetch(`/api/shopping-list-items/${props.item.id}`, {
      method: 'PATCH',
      body: {
        quantity: localQuantity.value,
        unit: localUnit.value,
        note: localNote.value || null,
      },
    });
    
    // If this is an article and aisle changed, update the article itself
    let aisleChanged = false;
    if (props.item.article_id && localAisle.value !== props.item.article?.default_aisle) {
      await $fetch(`/api/shopping/articles/${props.item.article_id}`, {
        method: 'PATCH',
        body: {
          default_aisle: localAisle.value,
        },
      });
      aisleChanged = true;
    }
    
    emit('updated', updated as ShoppingListItemDetail, aisleChanged);
    emit('update:modelValue', false);
  } catch (error: any) {
    console.error('Failed to update item:', error);
    alert(error?.data?.message || 'Failed to update item');
  } finally {
    saving.value = false;
  }
}

function handleDelete() {
  emit('delete');
  emit('update:modelValue', false);
}

// Prevent body scroll when modal is open
watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = '';
  }
});

onUnmounted(() => {
  document.body.style.overflow = '';
});
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-active .relative,
.modal-leave-active .relative {
  transition: transform 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .relative {
  transform: translateY(100%);
}

.modal-leave-to .relative {
  transform: translateY(100%);
}

@media (min-width: 640px) {
  .modal-enter-from .relative {
    transform: scale(0.95);
  }

  .modal-leave-to .relative {
    transform: scale(0.95);
  }
}
</style>
