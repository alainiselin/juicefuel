  <div 
      <template>
    class="flex-shrink-0 w-64 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 p-4 hover:border-gray-400 hover:bg-gray-100 transition-all cursor-pointer flex items-center justify-center"
    @click="$emit('click')"
  >
    <div class="text-center">
      <div class="text-4xl text-gray-400 mb-2">+</div>
      <p class="text-sm text-gray-600">Add Meal</p>
    </div>
  </div>
</template>

<script setup lang="ts">
defineEmits<{
  click: [];
}>();
</script>
