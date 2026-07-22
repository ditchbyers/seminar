import type { Review } from '@/lib/config';

function Stars({ rating }: { rating: number | null }) {
  const r = rating ?? 0;
  return <span className="text-yellow-500 text-xs whitespace-nowrap shrink-0">{'★'.repeat(r)}{'☆'.repeat(5 - r)}</span>;
}
export function ReviewCard({ review }: { review: Review }) {
  return (
    <article className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-semibold text-gray-800 text-sm leading-snug">{review.review_title ?? 'Untitled'}</h3>
        <Stars rating={review.review_rating} />
      </div>
      <p className="text-gray-600 text-sm line-clamp-4 mb-3">{review.review_text ?? '—'}</p>
      <div className="text-xs text-gray-400 flex flex-wrap gap-2">
        <span className="font-medium text-gray-700">{review.name ?? 'Unknown Hotel'}</span>
        {review.city && <span>· {review.city}</span>}
        {review.review_username && <span>by {review.review_username}</span>}
        {review.review_date && <span>{review.review_date.slice(0, 10)}</span>}
      </div>
    </article>
  );
}
