import { API_BASE, VALID_RESOLUTIONS } from '@/lib/config';
import { ReviewCardWithImage } from '../../components/ReviewCardWithImage';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export default async function TextImagesPage({
  params,
  searchParams,
}: {
  params: { resolution: string };
  searchParams: { table?: string; limit?: string; delay?: string };
}) {
  const { resolution } = params;
  if (!VALID_RESOLUTIONS.includes(resolution)) return notFound();

  const table = searchParams.table ?? 'hotel_reviews';
  const limit = searchParams.limit ?? '30';
  const delay = searchParams.delay ?? '0';

  const res = await fetch(
    `${API_BASE}/api/reviews?table=${table}&limit=${limit}&delay=${delay}`,
    { cache: 'no-store' }
  );
  const { data: reviews, total } = await res.json();

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold">
          Images <span className="text-blue-600">{resolution}</span>{' '}
          <span className="text-gray-400 text-base font-normal">({total} total)</span>
        </h1>
        <div className="flex gap-2 flex-wrap text-sm">
          {['480p', '720p', '1080p', '2k', '4k'].map(r => (
            <Link key={r} href={`/text-images/${r}?table=${table}`}
              className={`px-3 py-1 rounded-full border ${resolution === r ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 hover:bg-gray-50'}`}>
              {r}
            </Link>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {reviews.map((r: any) => <ReviewCardWithImage key={r.id} review={r} resolution={resolution} />)}
      </div>
    </div>
  );
}
