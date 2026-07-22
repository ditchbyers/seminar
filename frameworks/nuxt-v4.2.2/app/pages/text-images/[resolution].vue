<script setup lang="ts">
import { VALID_RESOLUTIONS } from '~/utils/config';
const route = useRoute();
const resolution = computed(() => route.params.resolution as string);
const table = computed(() => (route.query.table as string) || 'hotel_reviews');
const { getReviews } = useApi();
const { data } = await useAsyncData('text-images', () => getReviews({ table: table.value, limit: 30 }), { watch: [table, resolution] });
if (!VALID_RESOLUTIONS.includes(resolution.value)) { throw createError({ statusCode: 404 }); }
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6 flex-wrap gap-3">
      <h1 class="text-2xl font-bold">Images <span class="text-blue-600">{{ resolution }}</span></h1>
      <div class="flex gap-2 flex-wrap text-sm">
        <NuxtLink v-for="r in VALID_RESOLUTIONS" :key="r" :to="`/text-images/${r}?table=${table}`"
          :class="resolution === r ? 'px-3 py-1 rounded-full border bg-blue-600 text-white border-blue-600' : 'px-3 py-1 rounded-full border border-gray-300 hover:bg-gray-50'">{{ r }}</NuxtLink>
      </div>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      <ReviewCardWithImage v-for="r in data?.data" :key="r.id" :review="r" :resolution="resolution" />
    </div>
  </div>
</template>
