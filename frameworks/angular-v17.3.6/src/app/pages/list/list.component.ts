import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { ReviewCardComponent } from '../../components/review-card/review-card.component';
import { Review } from '../../config';

@Component({
  selector: 'app-list',
  standalone: true,
  imports: [CommonModule, ReviewCardComponent],
  template: `
    <h1 class="text-2xl font-bold mb-6">Review List <span class="text-sm font-normal text-gray-400">(JMeter target – 100 items)</span></h1>
    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      <app-review-card *ngFor="let r of reviews" [review]="r" />
    </div>
  `,
})
export class ListComponent implements OnInit {
  reviews: Review[] = [];

  constructor(private api: ApiService, private route: ActivatedRoute) {}

  ngOnInit() {
    const table = this.route.snapshot.queryParamMap.get('table') ?? 'hotel_reviews';
    const delay = Number(this.route.snapshot.queryParamMap.get('delay') ?? 0);
    this.api.getReviews({ table, limit: 100, delay }).subscribe(res => { this.reviews = res.data; });
  }
}
