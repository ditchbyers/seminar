import { Component } from '@angular/core';
import { RouterOutlet, RouterLink } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink],
  template: `
    <nav class="bg-white border-b border-gray-200 px-6 py-3 flex gap-4 text-sm font-medium">
      <a routerLink="/" class="hover:text-blue-600">Home</a>
      <a routerLink="/text-only" class="hover:text-blue-600">Text Only</a>
      <a routerLink="/text-images/480p" class="hover:text-blue-600">Images</a>
      <a routerLink="/text-videos/480p" class="hover:text-blue-600">Videos</a>
      <a routerLink="/list" class="hover:text-blue-600">List</a>
    </nav>
    <main class="max-w-7xl mx-auto px-4 py-8">
      <router-outlet />
    </main>
  `,
})
export class AppComponent {}
