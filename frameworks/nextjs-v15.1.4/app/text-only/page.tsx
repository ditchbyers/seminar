import { API_BASE } from '@/lib/config';
import { ReviewCard } from '../components/ReviewCard';
import Link from 'next/link';

// Next.js 15: searchParams is a Promise
export default async function TextOnlyPage({
  searchParams,
}: {
  searchParams: Promise<{ table?: string; limit?: string; delay?: string }>;
}) {
  const { table = 'hotel_reviews', limit = '50', delay = '0' } = await searchParams;

  const res = await fetch(
    `${API_BASE}/api/reviews?table=${table}&limit=${limit}&delay=${delay}`,
    { cache: 'no-store' }
  );
  const { data: reviews, total } = await res.json();

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold">
          Text Only <span className="text-gray-400 text-base font-normal">({total} total)</span>
        </h1>
        <div className="flex gap-2 text-sm">
          <Link href="?table=hotel_reviews" className={`px-3 py-1 rounded-full border ${table === 'hotel_reviews' ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 hover:bg-gray-50'}`}>Table 1</Link>
          <Link href="?table=hotel_reviews_dataset" className={`px-3 py-1 rounded-full border ${table === 'hotel_reviews_dataset' ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 hover:bg-gray-50'}`}>Table 2</Link>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {reviews.map((r: any) => <ReviewCard key={r.id} review={r} />)}
      </div>
    </div>
  );
}
