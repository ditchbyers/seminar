<script setup lang="ts">
import type { Review } from '~/utils/config';
import { imageUrl } from '~/utils/config';
const props = defineProps<{ review: Review; resolution: string }>();
const imgSrc = computed(() => imageUrl(props.review.id, props.resolution));
const stars = computed(() => {
  const r = props.review.review_rating ?? 0;
  return '★'.repeat(r) + '☆'.repeat(5 - r);
});
</script>

<template>
  <article class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
    <img :src="imgSrc" :alt="review.name || 'Hotel'" loading="lazy" class="w-full object-cover" />
    <div class="p-5">
      <div class="flex items-start justify-between gap-2 mb-2">
        <h3 class="font-semibold text-gray-800 text-sm leading-snug">{{ review.review_title || 'Untitled' }}</h3>
        <span class="text-yellow-500 text-xs whitespace-nowrap shrink-0">{{ stars }}</span>
      </div>
      <p class="text-gray-600 text-sm mb-3 line-clamp-3">{{ review.review_text || '—' }}</p>
      <div class="text-xs text-gray-400 flex flex-wrap gap-2">
        <span class="font-medium text-gray-700">{{ review.name || 'Unknown Hotel' }}</span>
        <span v-if="review.city">· {{ review.city }}</span>
      </div>
    </div>
  </article>
</template>
