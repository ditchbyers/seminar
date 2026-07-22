<script setup lang="ts">
const RESOLUTIONS = ['480p', '720p', '1080p', '2k', '4k'];
const VIDEO_RESOLUTIONS = ['720p', '1080p', '2k', '4k'];
</script>

<template>
  <div>
    <h1 class="text-3xl font-bold mb-4">Hotel Reviews – Nuxt v3</h1>
    <p class="text-gray-600 mb-8">Performance benchmark project.</p>
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <NuxtLink to="/text-only" class="block bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition">
        <h2 class="font-semibold text-lg mb-1">Text Only</h2>
        <p class="text-sm text-gray-500">Hotel reviews without any media.</p>
      </NuxtLink>
      <NuxtLink v-for="r in RESOLUTIONS" :key="`img-${r}`" :to="`/text-images/${r}`"
        class="block bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition">
        <h2 class="font-semibold text-lg mb-1">Images – {{ r }}</h2>
        <p class="text-sm text-gray-500">Reviews with {{ r }} images.</p>
      </NuxtLink>
      <NuxtLink v-for="r in VIDEO_RESOLUTIONS" :key="`vid-${r}`" :to="`/text-videos/${r}`"
        class="block bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition">
        <h2 class="font-semibold text-lg mb-1">Videos – {{ r }}</h2>
        <p class="text-sm text-gray-500">Reviews with {{ r }} videos.</p>
      </NuxtLink>
      <NuxtLink to="/list" class="block bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition">
        <h2 class="font-semibold text-lg mb-1">List (Load Test)</h2>
        <p class="text-sm text-gray-500">100 reviews – JMeter target.</p>
      </NuxtLink>
    </div>
  </div>
</template>
