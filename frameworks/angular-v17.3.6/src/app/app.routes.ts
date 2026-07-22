import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./pages/home/home.component').then(m => m.HomeComponent) },
  { path: 'text-only', loadComponent: () => import('./pages/text-only/text-only.component').then(m => m.TextOnlyComponent) },
  { path: 'text-images/:resolution', loadComponent: () => import('./pages/text-images/text-images.component').then(m => m.TextImagesComponent) },
  { path: 'text-videos', redirectTo: 'text-videos/720p', pathMatch: 'full' },
  { path: 'text-videos/:resolution', loadComponent: () => import('./pages/text-videos/text-videos.component').then(m => m.TextVideosComponent) },
  { path: 'list', loadComponent: () => import('./pages/list/list.component').then(m => m.ListComponent) },
];
