<template>
  <div class="bg-gray-50 text-gray-900 min-h-screen">
    <nav class="bg-white border-b border-gray-200 px-6 py-3 flex gap-4 text-sm font-medium">
      <NuxtLink to="/" class="hover:text-blue-600">Home</NuxtLink>
      <NuxtLink to="/text-only" class="hover:text-blue-600">Text Only</NuxtLink>
      <NuxtLink to="/text-images/480p" class="hover:text-blue-600">Images</NuxtLink>
      <NuxtLink to="/text-videos/480p" class="hover:text-blue-600">Videos</NuxtLink>
      <NuxtLink to="/list" class="hover:text-blue-600">List</NuxtLink>
    </nav>
    <main class="max-w-7xl mx-auto px-4 py-8">
      <NuxtPage />
    </main>
  </div>
</template>
