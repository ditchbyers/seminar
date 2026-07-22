import { Component, OnInit } from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { ReviewCardComponent } from '../../components/review-card/review-card.component';
import { Review } from '../../config';

@Component({
  selector: 'app-text-only',
  standalone: true,
  imports: [RouterLink, ReviewCardComponent],
  template: `
    <div class="flex items-center justify-between mb-6 flex-wrap gap-3">
      <h1 class="text-2xl font-bold">Text Only <span class="text-gray-400 text-base font-normal">({{ total }} total)</span></h1>
      <div class="flex gap-2 text-sm">
        <a routerLink="." [queryParams]="{table:'hotel_reviews'}" [class]="tabClass('hotel_reviews')">Table 1</a>
        <a routerLink="." [queryParams]="{table:'hotel_reviews_dataset'}" [class]="tabClass('hotel_reviews_dataset')">Table 2</a>
      </div>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      @for (r of reviews; track r.id) {
        <app-review-card [review]="r" />
      }
    </div>
  `,
})
export class TextOnlyComponent implements OnInit {
  reviews: Review[] = [];
  total = 0;
  table = 'hotel_reviews';

  constructor(private api: ApiService, private route: ActivatedRoute) {}

  ngOnInit() {
    this.route.queryParamMap.subscribe(params => {
      this.table = params.get('table') ?? 'hotel_reviews';
      this.api.getReviews({ table: this.table, limit: 50 }).subscribe(res => {
        this.reviews = res.data;
        this.total = res.total;
      });
    });
  }

  tabClass(t: string) {
    return `px-3 py-1 rounded-full border ${this.table === t ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 hover:bg-gray-50'}`;
  }
}
