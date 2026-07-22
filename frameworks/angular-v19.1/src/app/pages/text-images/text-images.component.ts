import { Component, OnInit } from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { ReviewCardWithImageComponent } from '../../components/review-card-with-image/review-card-with-image.component';
import { Review, VALID_RESOLUTIONS } from '../../config';

@Component({
  selector: 'app-text-images',
  standalone: true,
  imports: [RouterLink, ReviewCardWithImageComponent],
  template: `
    <div class="flex items-center justify-between mb-6 flex-wrap gap-3">
      <h1 class="text-2xl font-bold">Images <span class="text-blue-600">{{ resolution }}</span></h1>
      <div class="flex gap-2 flex-wrap text-sm">
        @for (r of resolutions; track r) {
          <a [routerLink]="['/text-images', r]" [queryParams]="{table}" [class]="resClass(r)">{{ r }}</a>
        }
      </div>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      @for (r of reviews; track r.id) {
        <app-review-card-with-image [review]="r" [resolution]="resolution" />
      }
    </div>
  `,
})
export class TextImagesComponent implements OnInit {
  reviews: Review[] = [];
  resolution = '480p';
  table = 'hotel_reviews';
  resolutions = VALID_RESOLUTIONS;

  constructor(private api: ApiService, private route: ActivatedRoute) {}

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      this.resolution = params.get('resolution') ?? '480p';
      this.route.queryParamMap.subscribe(qp => {
        this.table = qp.get('table') ?? 'hotel_reviews';
        this.api.getReviews({ table: this.table, limit: 30 }).subscribe(res => { this.reviews = res.data; });
      });
    });
  }

  resClass(r: string) {
    return `px-3 py-1 rounded-full border ${this.resolution === r ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 hover:bg-gray-50'}`;
  }
}
