import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

const IMAGE_RESOLUTIONS = ['480p', '720p', '1080p', '2k', '4k'];
const VIDEO_RESOLUTIONS_HOME = ['720p', '1080p', '2k', '4k'];

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink],
  template: `
    <h1 class="text-3xl font-bold mb-4">Hotel Reviews – Angular v19</h1>
    <p class="text-gray-600 mb-8">Performance benchmark project.</p>
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <a routerLink="/text-only" class="block bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition">
        <h2 class="font-semibold text-lg mb-1">Text Only</h2>
        <p class="text-sm text-gray-500">Hotel reviews without any media.</p>
      </a>
      @for (r of resolutions; track r) {
        <a [routerLink]="['/text-images', r]" class="block bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition">
          <h2 class="font-semibold text-lg mb-1">Images – {{ r }}</h2>
          <p class="text-sm text-gray-500">Reviews with {{ r }} images.</p>
        </a>
      }
      @for (r of videoResolutions; track r) {
        <a [routerLink]="['/text-videos', r]" class="block bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition">
          <h2 class="font-semibold text-lg mb-1">Videos – {{ r }}</h2>
          <p class="text-sm text-gray-500">Reviews with {{ r }} videos.</p>
        </a>
      }
      <a routerLink="/list" class="block bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition">
        <h2 class="font-semibold text-lg mb-1">List (Load Test)</h2>
        <p class="text-sm text-gray-500">100 reviews – JMeter target.</p>
      </a>
    </div>
  `,
})
export class HomeComponent {
  resolutions = IMAGE_RESOLUTIONS;
  videoResolutions = VIDEO_RESOLUTIONS_HOME;
}
