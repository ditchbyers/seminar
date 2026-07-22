import Link from 'next/link';

export default function HomePage() {
  const resolutions = ['480p', '720p', '1080p', '2k', '4k'];
  const videoResolutions = ['720p', '1080p', '2k', '4k'];
  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">Hotel Reviews – Next.js v14.2.3</h1>
      <p className="text-gray-600 mb-8">Performance benchmark project. Select a test scenario:</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link href="/text-only" className="block bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition">
          <h2 className="font-semibold text-lg mb-1">Text Only</h2>
          <p className="text-sm text-gray-500">Hotel reviews without any media.</p>
        </Link>
        {resolutions.map(res => (
          <Link key={res} href={`/text-images/${res}`} className="block bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition">
            <h2 className="font-semibold text-lg mb-1">Images – {res}</h2>
            <p className="text-sm text-gray-500">Reviews with {res} placeholder images.</p>
          </Link>
        ))}
        {videoResolutions.map(res => (
          <Link key={res} href={`/text-videos/${res}`} className="block bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition">
            <h2 className="font-semibold text-lg mb-1">Videos – {res}</h2>
            <p className="text-sm text-gray-500">Reviews with {res} sample videos.</p>
          </Link>
        ))}
        <Link href="/list" className="block bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition">
          <h2 className="font-semibold text-lg mb-1">List (Load Test)</h2>
          <p className="text-sm text-gray-500">100 reviews – target for JMeter scenarios.</p>
        </Link>
      </div>
    </div>
  );
}
