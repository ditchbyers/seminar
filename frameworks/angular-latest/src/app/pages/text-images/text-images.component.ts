import { AsyncPipe } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { combineLatest } from 'rxjs';
import { map, shareReplay, switchMap } from 'rxjs/operators';
import { ApiService } from '../../services/api.service';
import { ReviewCardWithImageComponent } from '../../components/review-card-with-image/review-card-with-image.component';
import { VALID_RESOLUTIONS } from '../../config';

@Component({
  selector: 'app-text-images',
  standalone: true,
  imports: [RouterLink, ReviewCardWithImageComponent, AsyncPipe],
  template: `
    @if (vm$ | async; as vm) {
    <div class="flex items-center justify-between mb-6 flex-wrap gap-3">
      <h1 class="text-2xl font-bold">Images <span class="text-blue-600">{{ vm.resolution }}</span></h1>
      <div class="flex gap-2 flex-wrap text-sm">
        @for (r of resolutions; track r) {
          <a [routerLink]="['/text-images', r]" [queryParams]="{table: vm.table}" [class]="resClass(vm.resolution, r)">{{ r }}</a>
        }
      </div>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      @for (r of vm.reviews; track (r.id ?? $index)) {
        <app-review-card-with-image [review]="r" [resolution]="vm.resolution" />
      }
    </div>
    }
  `,
})
export class TextImagesComponent {
  resolutions = VALID_RESOLUTIONS;
  vm$ = combineLatest([this.route.paramMap, this.route.queryParamMap]).pipe(
    map(([params, qp]) => ({
      resolution: params.get('resolution') ?? '480p',
      table: qp.get('table') ?? 'hotel_reviews',
    })),
    switchMap(({ resolution, table }) =>
      this.api.getReviews({ table, limit: 30 }).pipe(
        map(res => ({
          resolution,
          table,
          reviews: res.data,
        })),
      ),
    ),
    shareReplay(1),
  );

  constructor(private api: ApiService, private route: ActivatedRoute) {}

  resClass(currentResolution: string, resolution: string) {
    return `px-3 py-1 rounded-full border ${currentResolution === resolution ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 hover:bg-gray-50'}`;
  }
}
