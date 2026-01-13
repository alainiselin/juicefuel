<template>
  <div class="bg-white border border-gray-200 rounded-lg p-4">
    <h3 class="text-sm font-medium text-gray-700 mb-3">Add Ingredient</h3>
    
    <!-- Search Input -->
    <div class="relative mb-3">
      <input
        v-model="searchQuery"
        @input="onSearchInput"
        @focus="showDropdown = true"
        type="text"
        placeholder="Search ingredients..."
        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
      
      <!-- Dropdown Results -->
      <div
        v-if="showDropdown && searchQuery && searchResults.length > 0"
        class="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto"
      >
        <button
          v-for="ingredient in searchResults"
          :key="ingredient.id"
          @click="selectIngredient(ingredient)"
          class="w-full text-left px-3 py-2 hover:bg-gray-100 transition-colors"
        >
          {{ ingredient.canonical_name }}
        </button>
      </div>
      
      <div v-if="searching" class="absolute right-3 top-2">
        <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
      </div>
    </div>

    <!-- Add Form (shown after selecting ingredient) -->
    <div v-if="selectedIngredient" class="space-y-3 p-3 bg-blue-50 rounded-lg">
      <div class="text-sm font-medium text-gray-900">
        Adding: {{ selectedIngredient.canonical_name }}
      </div>
      
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-xs font-medium text-gray-700 mb-1">Quantity</label>
          <input
            v-model.number="quantity"
            ref="quantityInput"
            type="number"
            step="0.1"
            min="0.01"
            placeholder="0"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            @keypress.enter="addIngredient"
          />
        </div>
        
        <div>
          <label class="block text-xs font-medium text-gray-700 mb-1">Unit</label>
          <select
            v-model="unit"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
        </div>
      </div>
      
      <div>
        <label class="block text-xs font-medium text-gray-700 mb-1">Note (optional)</label>
        <input
          v-model="note"
          type="text"
          placeholder="diced, chopped, to taste..."
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          @keypress.enter="addIngredient"
        />
      </div>
      
      <div class="flex gap-2">
        <button
          @click="addIngredient"
          :disabled="!quantity || quantity <= 0 || adding"
          class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
        >
          {{ adding ? 'Adding...' : 'Add' }}
        </button>
        <button
          @click="cancelAdd"
          class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { nextTick } from "vue";
const props = defineProps<{
  recipeId: string;
}>();

const emit = defineEmits<{
  added: [ingredient: any];
  'before-add': [];
}>();

const searchQuery = ref('');
const searchResults = ref<any[]>([]);
const searching = ref(false);
const showDropdown = ref(false);
const selectedIngredient = ref<any>(null);
const quantity = ref<number | null>(null);
const unit = ref('G');
const note = ref('');
const adding = ref(false);
const quantityInput = ref<HTMLInputElement | null>(null);

let searchTimeout: NodeJS.Timeout | null = null;

async function onSearchInput() {
  if (searchTimeout) clearTimeout(searchTimeout);
  
  if (!searchQuery.value || searchQuery.value.length < 2) {
    searchResults.value = [];
    return;
  }
  
  searchTimeout = setTimeout(async () => {
    searching.value = true;
    try {
      searchResults.value = await $fetch('/api/ingredients', {
        params: {
          query: searchQuery.value,
          limit: 10,
          recipe_only: 'true',
        },
      });
      showDropdown.value = true;
    } catch (error) {
      console.error('Failed to search ingredients:', error);
      searchResults.value = [];
    } finally {
      searching.value = false;
    }
  }, 300);
}

function selectIngredient(ingredient: any) {
  selectedIngredient.value = ingredient;
  showDropdown.value = false;
  nextTick(() => {
    quantityInput.value?.focus();
  });
}

async function addIngredient() {
  if (!selectedIngredient.value || !quantity.value || quantity.value <= 0) return;
  
  // Emit before-add to let parent handle recipe creation if needed
  emit('before-add');
  
  // Wait a tick for parent to potentially create recipe
  await nextTick();
  
  adding.value = true;
  try {
    const added = await $fetch(`/api/recipes/${props.recipeId}/ingredients`, {
      method: 'POST',
      body: {
        ingredient_id: selectedIngredient.value.id,
        quantity: quantity.value,
        unit: unit.value,
        note: note.value || undefined,
      },
    });
    
    emit('added', added);
    resetForm();
  } catch (error: any) {
    console.error('Failed to add ingredient:', error);
    alert(error?.data?.message || 'Failed to add ingredient');
  } finally {
    adding.value = false;
  }
}

function cancelAdd() {
  resetForm();
}

function resetForm() {
  selectedIngredient.value = null;
  quantity.value = null;
  unit.value = 'G';
  note.value = '';
  searchQuery.value = '';
  searchResults.value = [];
}

onMounted(() => {
  document.addEventListener('click', (e) => {
    if (!(e.target as HTMLElement).closest('.relative')) {
      showDropdown.value = false;
    }
  });
});
</script>
