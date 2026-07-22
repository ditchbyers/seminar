<script setup lang="ts">
const route = useRoute();
const { getReviews } = useApi();
const table = computed(() => (route.query.table as string) || 'hotel_reviews');
const { data, refresh } = await useAsyncData('text-only', () => getReviews({ table: table.value, limit: 50 }), { watch: [table] });
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6 flex-wrap gap-3">
      <h1 class="text-2xl font-bold">Text Only <span class="text-gray-400 text-base font-normal">({{ data?.total }} total)</span></h1>
      <div class="flex gap-2 text-sm">
        <NuxtLink :to="{ query: { table: 'hotel_reviews' } }" :class="table === 'hotel_reviews' ? 'px-3 py-1 rounded-full border bg-blue-600 text-white border-blue-600' : 'px-3 py-1 rounded-full border border-gray-300 hover:bg-gray-50'">Table 1</NuxtLink>
        <NuxtLink :to="{ query: { table: 'hotel_reviews_dataset' } }" :class="table === 'hotel_reviews_dataset' ? 'px-3 py-1 rounded-full border bg-blue-600 text-white border-blue-600' : 'px-3 py-1 rounded-full border border-gray-300 hover:bg-gray-50'">Table 2</NuxtLink>
      </div>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      <ReviewCard v-for="r in data?.data" :key="r.id" :review="r" />
    </div>
  </div>
</template>
