import Image from 'next/image';
import type { Review } from '@/lib/config';
import { imageUrl, IMAGE_RESOLUTIONS } from '@/lib/config';

function Stars({ rating }: { rating: number | null }) {
  const r = rating ?? 0;
  return <span className="text-yellow-500 text-xs whitespace-nowrap shrink-0">{'★'.repeat(r)}{'☆'.repeat(5 - r)}</span>;
}

export function ReviewCardWithImage({ review, resolution }: { review: Review; resolution: string }) {
  const src = imageUrl(review.id, resolution);
  const dims = IMAGE_RESOLUTIONS[resolution] ?? IMAGE_RESOLUTIONS['480p'];
  return (
    <article className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <Image
        src={src}
        alt={`Hotel photo – ${review.name}`}
        width={dims.width}
        height={dims.height}
        className="w-full object-cover"
        loading="lazy"
        unoptimized
      />
      <div className="p-5">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold text-gray-800 text-sm leading-snug">{review.review_title ?? 'Untitled'}</h3>
          <Stars rating={review.review_rating} />
        </div>
        <p className="text-gray-600 text-sm line-clamp-3 mb-3">{review.review_text ?? '—'}</p>
        <div className="text-xs text-gray-400 flex flex-wrap gap-2">
          <span className="font-medium text-gray-700">{review.name ?? 'Unknown Hotel'}</span>
          {review.city && <span>· {review.city}</span>}
          {review.review_username && <span>by {review.review_username}</span>}
        </div>
      </div>
    </article>
  );
}
