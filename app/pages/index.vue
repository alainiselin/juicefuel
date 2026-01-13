<template>
  <div class="min-h-screen bg-gray-100">
    <div class="container mx-auto px-4 py-8">
      <h1 class="text-4xl font-bold text-gray-900 mb-8">JuiceFuel</h1>
      
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <NuxtLink 
          to="/recipes"
          class="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow"
        >
          <h2 class="text-2xl font-semibold text-gray-800 mb-2">Recipes</h2>
          <p class="text-gray-600">Manage your recipe collection</p>
        </NuxtLink>

        <NuxtLink 
          to="/plan"
          class="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow"
        >
          <h2 class="text-2xl font-semibold text-gray-800 mb-2">Meal Plan</h2>
          <p class="text-gray-600">Plan your meals for the week</p>
        </NuxtLink>

        <NuxtLink 
          to="/shopping-list"
          class="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow"
        >
          <h2 class="text-2xl font-semibold text-gray-800 mb-2">Shopping List</h2>
          <p class="text-gray-600">View aggregated shopping list</p>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
