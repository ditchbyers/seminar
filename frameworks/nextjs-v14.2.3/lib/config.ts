export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export const IMAGE_RESOLUTIONS: Record<string, { width: number; height: number }> = {
  '480p':  { width: 854,  height: 480  },
  '720p':  { width: 1280, height: 720  },
  '1080p': { width: 1920, height: 1080 },
  '2k':    { width: 2560, height: 1440 },
  '4k':    { width: 3840, height: 2160 },
};

export const VALID_RESOLUTIONS = Object.keys(IMAGE_RESOLUTIONS);
export const VIDEO_RESOLUTIONS = VALID_RESOLUTIONS.filter(r => r !== '480p');

export function imageUrl(id: number, resolution: string): string {
  const { width, height } = IMAGE_RESOLUTIONS[resolution] ?? IMAGE_RESOLUTIONS['480p'];
  return `https://picsum.photos/seed/hotel${id}/${width}/${height}`;
}

export interface Review {
  id: number;
  name: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  review_text: string | null;
  review_title: string | null;
  review_rating: number | null;
  review_date: string | null;
  review_username: string | null;
  review_user_city: string | null;
}
