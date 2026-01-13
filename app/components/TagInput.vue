<template>
  <div class="space-y-2">
    <div class="flex flex-wrap gap-2 mb-2">
      <span
        v-for="tag in selectedTags"
        :key="tag.id"
        class="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs"
      >
        <span>{{ tag.name }}</span>
        <button
          @click="removeTag(tag)"
          class="hover:text-blue-900"
          type="button"
        >
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </span>
    </div>

    <div class="relative">
      <input
        v-model="searchQuery"
        @input="onSearchInput"
        @focus="showSuggestions = true"
        @blur="onBlur"
        type="text"
        :placeholder="placeholder || 'Search or create tags...'"
        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
      />

      <div
        v-if="showSuggestions && (suggestions.length > 0 || searchQuery.trim())"
        class="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
      >
        <button
          v-for="tag in suggestions"
          :key="tag.id"
          @mousedown.prevent="addTag(tag)"
          class="w-full px-3 py-2 text-left hover:bg-blue-50 flex items-center justify-between text-sm"
          type="button"
        >
          <span>{{ tag.name }}</span>
          <span v-if="tag.kind" class="text-xs text-gray-500">{{ tag.kind }}</span>
        </button>

        <button
          v-if="searchQuery.trim() && !suggestions.some(t => t.name.toLowerCase() === searchQuery.toLowerCase())"
          @mousedown.prevent="createAndAddTag"
          class="w-full px-3 py-2 text-left hover:bg-green-50 text-green-700 border-t border-gray-200 text-sm"
          type="button"
        >
          + Create "{{ searchQuery }}"
        </button>

        <div v-if="suggestions.length === 0 && !searchQuery.trim()" class="px-3 py-2 text-gray-500 text-sm">
          Start typing to search...
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';

const props = defineProps<{
  modelValue: Array<{ id: string; name: string; kind?: string | null }>;
  householdId: string;
  kinds?: string[];
  placeholder?: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [tags: Array<{ id: string; name: string; kind?: string | null }>];
  'tag-added': [tagId: string];
  'tag-removed': [tagId: string];
}>();

const searchQuery = ref('');
const suggestions = ref<Array<{ id: string; name: string; kind?: string | null }>>([]);
const showSuggestions = ref(false);
const searchTimeout = ref<NodeJS.Timeout | null>(null);

const selectedTags = computed(() => props.modelValue);

const onSearchInput = () => {
  if (searchTimeout.value) {
    clearTimeout(searchTimeout.value);
  }

  if (!searchQuery.value.trim()) {
    suggestions.value = [];
    return;
  }

  // Guard: Don't search if householdId is missing or invalid
  if (!props.householdId || props.householdId.length < 32) {
    suggestions.value = [];
    return;
  }

  searchTimeout.value = setTimeout(async () => {
    try {
      const query = searchQuery.value.trim();
      const params = new URLSearchParams({
        household_id: props.householdId,
        limit: '10',
      });

      // Check for category prefix (e.g., "cuisine:", "diet:", or just "cuisine")
      const categoryMatch = query.match(/^(cuisine|diet|flavor|allergen|technique|time|cost):?\s*(.*)$/i);
      
      if (categoryMatch) {
        const [, category, searchTerm] = categoryMatch;
        params.append('kinds', category.toUpperCase());
        params.append('query', searchTerm.trim() || ''); // Empty query shows all in category
      } else {
        params.append('query', query);
        if (props.kinds && props.kinds.length > 0) {
          params.append('kinds', props.kinds.join(','));
        }
      }

      const results = await $fetch<Array<{ id: string; name: string; kind?: string | null }>>(
        `/api/tags?${params.toString()}`
      );

      // Filter out already selected tags
      suggestions.value = results.filter(
        tag => !selectedTags.value.some(selected => selected.id === tag.id)
      );
    } catch (err) {
      console.error('Failed to search tags:', err);
    }
  }, 300);
};

const addTag = (tag: { id: string; name: string; kind?: string | null }) => {
  if (!selectedTags.value.some(t => t.id === tag.id)) {
    emit('update:modelValue', [...selectedTags.value, tag]);
    emit('tag-added', tag.id);
  }
  searchQuery.value = '';
  suggestions.value = [];
  showSuggestions.value = false;
};

const removeTag = (tag: { id: string; name: string; kind?: string | null }) => {
  emit('update:modelValue', selectedTags.value.filter(t => t.id !== tag.id));
  emit('tag-removed', tag.id);
};

const createAndAddTag = async () => {
  try {
    const newTag = await $fetch<{ id: string; name: string; kind?: string | null }>('/api/tags', {
      method: 'POST',
      body: {
        label: searchQuery.value,
        kind: props.kinds?.[0] || null,
        scope: 'HOUSEHOLD',
        household_id: props.householdId,
      },
    });

    addTag(newTag);
  } catch (err) {
    console.error('Failed to create tag:', err);
  }
};

const onBlur = () => {
  setTimeout(() => {
    showSuggestions.value = false;
  }, 200);
};

watch(() => props.householdId, () => {
  suggestions.value = [];
  searchQuery.value = '';
});
</script>
