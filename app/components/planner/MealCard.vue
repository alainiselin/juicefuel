<template>
  <div 
    :class="[
      'bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow cursor-pointer flex flex-col',
      compact ? 'p-2 h-full' : 'flex-shrink-0 w-64 p-4'
    ]"
    @click="handleClick"
  >
    <!-- Recipe Title -->
    <h3 :class="[
      'font-semibold text-gray-900 mb-2 line-clamp-2 flex-grow',
      compact ? 'text-sm' : 'text-lg'
    ]">
      {{ entry.recipe?.title || 'Untitled Recipe' }}
    </h3>
    
    <!-- Quick Info -->
    <div :class="['mt-auto pt-2 border-t border-gray-100', compact ? 'text-xs' : 'text-sm']">
      <div class="flex items-center justify-between text-gray-600">
        <span>{{ ingredientCount }} ingredients</span>
        <button
          @click.stop="$emit('delete', entry.id)"
          class="text-red-600 hover:text-red-700 text-xs"
        >
          Delete
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { MealPlanEntry } from '../../../spec/schemas';

const props = withDefaults(defineProps<{
  entry: MealPlanEntry;
  compact?: boolean;
}>(), {
  compact: false,
});

const emit = defineEmits<{
  delete: [id: string];
}>();

const router = useRouter();

const ingredientCount = computed(() => {
  return props.entry.recipe?.ingredients?.length || 0;
});

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
};

const handleClick = () => {
  if (props.entry.recipe_id) {
    router.push(`/meal/${props.entry.id}`);
  }
};
</script>
