import Link from 'next/link';
const RESOLUTIONS = ['480p', '720p', '1080p', '2k', '4k'];
const VIDEO_RESOLUTIONS = ['720p', '1080p', '2k', '4k'];

export default function HomePage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">Hotel Reviews – Next.js (latest)</h1>
      <p className="text-gray-600 mb-8">Performance benchmark project.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link href="/text-only" className="block bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition">
          <h2 className="font-semibold text-lg mb-1">Text Only</h2>
          <p className="text-sm text-gray-500">Hotel reviews without any media.</p>
        </Link>
        {RESOLUTIONS.map(r => (
          <Link key={r} href={`/text-images/${r}`} className="block bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition">
            <h2 className="font-semibold text-lg mb-1">Images – {r}</h2>
            <p className="text-sm text-gray-500">Reviews with {r} images.</p>
          </Link>
        ))}
        {VIDEO_RESOLUTIONS.map(r => (
          <Link key={r} href={`/text-videos/${r}`} className="block bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition">
            <h2 className="font-semibold text-lg mb-1">Videos – {r}</h2>
            <p className="text-sm text-gray-500">Reviews with {r} videos.</p>
          </Link>
        ))}
        <Link href="/list" className="block bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition">
          <h2 className="font-semibold text-lg mb-1">List (Load Test)</h2>
          <p className="text-sm text-gray-500">100 reviews – JMeter target.</p>
        </Link>
      </div>
    </div>
  );
}
