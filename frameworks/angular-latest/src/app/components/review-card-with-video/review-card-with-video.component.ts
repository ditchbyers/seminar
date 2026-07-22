import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { Review } from '../../config';
import { ApiService, VideoMeta } from '../../services/api.service';

@Component({
  selector: 'app-review-card-with-video',
  standalone: true,
  template: `
    <article class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      @if (video) {
        <video class="w-full"
          [attr.width]="video.width" [attr.height]="video.height">
          <source [src]="video.url" type="video/mp4" />
        </video>
      }
      <div class="p-5">
        <div class="flex items-start justify-between gap-2 mb-2">
          <h3 class="font-semibold text-gray-800 text-sm leading-snug">{{ review.review_title || 'Untitled' }}</h3>
          <span class="text-yellow-500 text-xs whitespace-nowrap shrink-0">{{ stars }}</span>
        </div>
        <p class="text-gray-600 text-sm mb-3 line-clamp-3">{{ review.review_text || '—' }}</p>
        <div class="text-xs text-gray-400 flex flex-wrap gap-2">
          <span class="font-medium text-gray-700">{{ review.name || 'Unknown Hotel' }}</span>
          @if (review.city) { <span>· {{ review.city }}</span> }
        </div>
      </div>
    </article>
  `,
})
export class ReviewCardWithVideoComponent implements OnChanges {
  @Input({ required: true }) review!: Review;
  @Input({ required: true }) resolution!: string;
  video: VideoMeta | null = null;

  constructor(private api: ApiService) {}

  ngOnChanges(changes: SimpleChanges) {
    if (changes['resolution']?.currentValue && this.resolution) {
      this.api.getVideo(this.resolution).subscribe(v => (this.video = v));
    }
  }

  get stars() {
    const rating = Number(this.review?.review_rating ?? 0);
    const r = Math.max(0, Math.min(5, Number.isFinite(rating) ? Math.round(rating) : 0));
    return '★'.repeat(r) + '☆'.repeat(5 - r);
  }
}
