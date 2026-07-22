import { Component, Input } from '@angular/core';
import { Review } from '../../config';

@Component({
  selector: 'app-review-card',
  standalone: true,
  template: `
    <article class="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <div class="flex items-start justify-between gap-2 mb-2">
        <h3 class="font-semibold text-gray-800 text-sm leading-snug">{{ review.review_title || 'Untitled' }}</h3>
        <span class="text-yellow-500 text-xs whitespace-nowrap shrink-0">{{ stars }}</span>
      </div>
      <p class="text-gray-600 text-sm mb-3 line-clamp-4">{{ review.review_text || '—' }}</p>
      <div class="text-xs text-gray-400 flex flex-wrap gap-2">
        <span class="font-medium text-gray-700">{{ review.name || 'Unknown Hotel' }}</span>
        @if (review.city) { <span>· {{ review.city }}</span> }
        @if (review.review_username) { <span>by {{ review.review_username }}</span> }
        @if (review.review_date) { <span>{{ review.review_date!.slice(0, 10) }}</span> }
      </div>
    </article>
  `,
})
export class ReviewCardComponent {
  @Input({ required: true }) review!: Review;
  get stars() {
    const rating = Number(this.review?.review_rating ?? 0);
    const r = Math.max(0, Math.min(5, Number.isFinite(rating) ? Math.round(rating) : 0));
    return '★'.repeat(r) + '☆'.repeat(5 - r);
  }
}
