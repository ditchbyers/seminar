import type { Metadata } from 'next';
import './globals.css';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Hotel Reviews – Next.js v15',
  description: 'Performance benchmark',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 min-h-screen">
        <nav className="bg-white border-b border-gray-200 px-6 py-3 flex gap-4 text-sm font-medium">
          <Link href="/" className="hover:text-blue-600">Home</Link>
          <Link href="/text-only" className="hover:text-blue-600">Text Only</Link>
          <Link href="/text-images/480p" className="hover:text-blue-600">Images</Link>
          <Link href="/text-videos/480p" className="hover:text-blue-600">Videos</Link>
          <Link href="/list" className="hover:text-blue-600">List (Load Test)</Link>
        </nav>
        <main className="max-w-7xl mx-auto px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
