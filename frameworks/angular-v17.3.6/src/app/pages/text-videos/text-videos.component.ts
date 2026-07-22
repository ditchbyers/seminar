import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { ReviewCardWithVideoComponent } from '../../components/review-card-with-video/review-card-with-video.component';
import { Review, VIDEO_RESOLUTIONS } from '../../config';

@Component({
  selector: 'app-text-videos',
  standalone: true,
  imports: [CommonModule, RouterLink, ReviewCardWithVideoComponent],
  template: `
    <div class="flex items-center justify-between mb-6 flex-wrap gap-3">
      <h1 class="text-2xl font-bold">Videos <span class="text-blue-600">{{ resolution }}</span></h1>
      <div class="flex gap-2 flex-wrap text-sm">
        <a *ngFor="let r of resolutions" [routerLink]="['/text-videos', r]" [queryParams]="{table}"
          [class]="resClass(r)">{{ r }}</a>
      </div>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <app-review-card-with-video *ngFor="let r of reviews" [review]="r" [resolution]="resolution" />
    </div>
  `,
})
export class TextVideosComponent implements OnInit {
  reviews: Review[] = [];
  resolution = '720p';
  table = 'hotel_reviews';
  resolutions = VIDEO_RESOLUTIONS;

  constructor(private api: ApiService, private route: ActivatedRoute) {}

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      this.resolution = params.get('resolution') ?? '720p';
      this.route.queryParamMap.subscribe(qp => {
        this.table = qp.get('table') ?? 'hotel_reviews';
        this.api.getReviews({ table: this.table, limit: 12 }).subscribe(res => { this.reviews = res.data; });
      });
    });
  }

  resClass(r: string) {
    return `px-3 py-1 rounded-full border ${this.resolution === r ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 hover:bg-gray-50'}`;
  }
}
