<script setup lang="ts">
const route = useRoute();
const { getReviews } = useApi();
const table = (route.query.table as string) || 'hotel_reviews';
const delay = Number(route.query.delay ?? 0);
const { data } = await useAsyncData('list', () => getReviews({ table, limit: 100, delay }));
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold mb-6">Review List <span class="text-sm font-normal text-gray-400">(JMeter target – 100 items)</span></h1>
    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      <ReviewCard v-for="r in data?.data" :key="r.id" :review="r" />
    </div>
  </div>
</template>
