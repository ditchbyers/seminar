import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE, Review } from '../config';

export interface ReviewsResponse { data: Review[]; total: number; limit: number; offset: number; }
export interface VideoMeta { url: string; width: number; height: number; label: string; }

@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor(private http: HttpClient) {}

  getReviews(params: { table?: string; limit?: number; delay?: number }): Observable<ReviewsResponse> {
    const { table = 'hotel_reviews', limit = 50, delay = 0 } = params;
    return this.http.get<ReviewsResponse>(`${API_BASE}/api/reviews?table=${table}&limit=${limit}&delay=${delay}`);
  }

  getVideo(resolution: string): Observable<VideoMeta> {
    return this.http.get<VideoMeta>(`${API_BASE}/api/media/video/${resolution}`);
  }
}
