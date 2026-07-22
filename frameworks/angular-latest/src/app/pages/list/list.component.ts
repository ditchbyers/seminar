import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { combineLatest, distinctUntilChanged, map, startWith } from 'rxjs';
import { ApiService } from '../../services/api.service';
import { ReviewCardComponent } from '../../components/review-card/review-card.component';
import { Review } from '../../config';

@Component({
  selector: 'app-list',
  standalone: true,
  imports: [ReviewCardComponent],
  template: `
    <h1 class="text-2xl font-bold mb-6">Review List <span class="text-sm font-normal text-gray-400">(JMeter target – 100 items)</span></h1>
    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      @for (r of reviews; track r.id) { <app-review-card [review]="r" /> }
    </div>
  `,
})
export class ListComponent implements OnInit {
  reviews: Review[] = [];
  table = 'hotel_reviews';
  delay = 0;

  constructor(private api: ApiService, private route: ActivatedRoute) {}

  ngOnInit() {
    const table$ = this.route.queryParamMap.pipe(
      map(params => params.get('table') ?? 'hotel_reviews'),
      startWith(this.route.snapshot.queryParamMap.get('table') ?? 'hotel_reviews'),
      distinctUntilChanged(),
    );

    const delay$ = this.route.queryParamMap.pipe(
      map(params => Number(params.get('delay') ?? 0)),
      startWith(Number(this.route.snapshot.queryParamMap.get('delay') ?? 0)),
      distinctUntilChanged(),
    );

    combineLatest([table$, delay$]).subscribe(([table, delay]) => {
      this.table = table;
      this.delay = delay;
      this.loadReviews();
    });
  }

  private loadReviews() {
    this.api.getReviews({ table: this.table, limit: 100, delay: this.delay }).subscribe(res => {
      this.reviews = res.data;
    });
  }
}
