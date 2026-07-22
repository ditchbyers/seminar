import { API_BASE } from '@/lib/config';
import { ReviewCard } from '../components/ReviewCard';

export default async function ListPage({
  searchParams,
}: {
  searchParams: Promise<{ table?: string; delay?: string }>;
}) {
  const { table = 'hotel_reviews', delay = '0' } = await searchParams;
  const res = await fetch(
    `${API_BASE}/api/reviews?table=${table}&limit=100&delay=${delay}`,
    { cache: 'no-store' }
  );
  const { data: reviews } = await res.json();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">
        Review List <span className="text-sm text-gray-400 font-normal">(100 items – JMeter target)</span>
      </h1>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {reviews.map((r: any) => <ReviewCard key={r.id} review={r} />)}
      </div>
    </div>
  );
}
