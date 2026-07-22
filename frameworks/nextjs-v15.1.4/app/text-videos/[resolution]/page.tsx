import { API_BASE, VALID_RESOLUTIONS, VIDEO_RESOLUTIONS } from '@/lib/config';
import { ReviewCardWithVideo } from '../../components/ReviewCardWithVideo';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export default async function TextVideosPage({
  params,
  searchParams,
}: {
  params: Promise<{ resolution: string }>;
  searchParams: Promise<{ table?: string; limit?: string; delay?: string }>;
}) {
  const { resolution } = await params;
  if (!VIDEO_RESOLUTIONS.includes(resolution)) return notFound();
  const { table = 'hotel_reviews', limit = '12', delay = '0' } = await searchParams;

  const res = await fetch(
    `${API_BASE}/api/reviews?table=${table}&limit=${limit}&delay=${delay}`,
    { cache: 'no-store' }
  );
  const { data: reviews, total } = await res.json();

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold">
          Videos <span className="text-blue-600">{resolution}</span>{' '}
          <span className="text-gray-400 text-base font-normal">({total} total)</span>
        </h1>
        <div className="flex gap-2 flex-wrap text-sm">
          {VIDEO_RESOLUTIONS.map(r => (
            <Link key={r} href={`/text-videos/${r}?table=${table}`}
              className={`px-3 py-1 rounded-full border ${resolution === r ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 hover:bg-gray-50'}`}>{r}</Link>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reviews.map((r: any) => <ReviewCardWithVideo key={r.id} review={r} resolution={resolution} />)}
      </div>
    </div>
  );
}
