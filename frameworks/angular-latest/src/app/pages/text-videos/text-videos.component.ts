import { AsyncPipe } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { combineLatest } from 'rxjs';
import { map, shareReplay, switchMap } from 'rxjs/operators';
import { ApiService } from '../../services/api.service';
import { ReviewCardWithVideoComponent } from '../../components/review-card-with-video/review-card-with-video.component';
import { VIDEO_RESOLUTIONS } from '../../config';

@Component({
  selector: 'app-text-videos',
  standalone: true,
  imports: [RouterLink, ReviewCardWithVideoComponent, AsyncPipe],
  template: `
    @if (vm$ | async; as vm) {
    <div class="flex items-center justify-between mb-6 flex-wrap gap-3">
      <h1 class="text-2xl font-bold">Videos <span class="text-blue-600">{{ vm.resolution }}</span></h1>
      <div class="flex gap-2 flex-wrap text-sm">
        @for (r of resolutions; track r) {
          <a [routerLink]="['/text-videos', r]" [queryParams]="{table: vm.table}" [class]="resClass(vm.resolution, r)">{{ r }}</a>
        }
      </div>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      @for (r of vm.reviews; track (r.id ?? $index)) {
        <app-review-card-with-video [review]="r" [resolution]="vm.resolution" />
      }
    </div>
    }
  `,
})
export class TextVideosComponent {
  resolutions = VIDEO_RESOLUTIONS;
  vm$ = combineLatest([this.route.paramMap, this.route.queryParamMap]).pipe(
    map(([params, qp]) => ({
      resolution: params.get('resolution') ?? '720p',
      table: qp.get('table') ?? 'hotel_reviews',
    })),
    switchMap(({ resolution, table }) =>
      this.api.getReviews({ table, limit: 12 }).pipe(
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
