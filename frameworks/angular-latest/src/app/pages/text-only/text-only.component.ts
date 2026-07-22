import { AsyncPipe } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { map, shareReplay, switchMap } from 'rxjs/operators';
import { ApiService } from '../../services/api.service';
import { ReviewCardComponent } from '../../components/review-card/review-card.component';

@Component({
  selector: 'app-text-only',
  standalone: true,
  imports: [RouterLink, ReviewCardComponent, AsyncPipe],
  template: `
    @if (vm$ | async; as vm) {
    <div class="flex items-center justify-between mb-6 flex-wrap gap-3">
      <h1 class="text-2xl font-bold">Text Only <span class="text-gray-400 text-base font-normal">({{ vm.total }} total)</span></h1>
      <div class="flex gap-2 text-sm">
        <a routerLink="." [queryParams]="{table:'hotel_reviews'}" [class]="tabClass(vm.table, 'hotel_reviews')">Table 1</a>
        <a routerLink="." [queryParams]="{table:'hotel_reviews_dataset'}" [class]="tabClass(vm.table, 'hotel_reviews_dataset')">Table 2</a>
      </div>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      @for (r of vm.reviews; track (r.id ?? $index)) { <app-review-card [review]="r" /> }
    </div>
    }
  `,
})
export class TextOnlyComponent {
  vm$ = this.route.queryParamMap.pipe(
    map(params => params.get('table') ?? 'hotel_reviews'),
    switchMap(table =>
      this.api.getReviews({ table, limit: 50 }).pipe(
        map(res => ({
          table,
          reviews: res.data,
          total: res.total,
        })),
      ),
    ),
    shareReplay(1),
  );

  constructor(private api: ApiService, private route: ActivatedRoute) {}

  tabClass(currentTable: string, table: string) {
    return `px-3 py-1 rounded-full border ${currentTable === table ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 hover:bg-gray-50'}`;
  }
}
