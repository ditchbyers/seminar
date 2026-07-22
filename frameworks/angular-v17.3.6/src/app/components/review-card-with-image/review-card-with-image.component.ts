import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Review, imageUrl } from '../../config';

@Component({
  selector: 'app-review-card-with-image',
  standalone: true,
  imports: [CommonModule],
  template: `
    <article class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <img [src]="imgSrc" [alt]="review.name || 'Hotel'" loading="lazy" class="w-full object-cover" />
      <div class="p-5">
        <div class="flex items-start justify-between gap-2 mb-2">
          <h3 class="font-semibold text-gray-800 text-sm leading-snug">{{ review.review_title || 'Untitled' }}</h3>
          <span class="text-yellow-500 text-xs whitespace-nowrap shrink-0">{{ stars }}</span>
        </div>
        <p class="text-gray-600 text-sm mb-3 line-clamp-3">{{ review.review_text || '—' }}</p>
        <div class="text-xs text-gray-400 flex flex-wrap gap-2">
          <span class="font-medium text-gray-700">{{ review.name || 'Unknown Hotel' }}</span>
          <span *ngIf="review.city">· {{ review.city }}</span>
        </div>
      </div>
    </article>
  `,
})
export class ReviewCardWithImageComponent implements OnInit {
  @Input({ required: true }) review!: Review;
  @Input({ required: true }) resolution!: string;
  imgSrc = '';

  ngOnInit() { this.imgSrc = imageUrl(this.review.id, this.resolution); }
  get stars() {
    const r = this.review.review_rating ?? 0;
    return '★'.repeat(r) + '☆'.repeat(5 - r);
  }
}
