import './globals.css';
import { Geist, Geist_Mono } from 'next/font/google';
import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import AppSidebar from './components/AppSidebar';
import AppBreadcrumb from './components/AppBreadcrumb';

const geistSans = Geist({ subsets: ['latin'], variable: '--font-geist-sans' });
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' });

export const metadata: Metadata = {
  title: 'Lighthouse Evaluation Dashboard',
  description: 'Scientific evaluation dashboard for Lighthouse benchmark runs',
};

export const viewport: Viewport = {
  themeColor: '#080f1e',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="bg-background font-sans" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased h-dvh overflow-hidden`}>
        <SidebarProvider defaultOpen>
          <AppSidebar />
          <SidebarInset className="bg-background text-foreground min-w-0 flex h-dvh flex-col overflow-hidden">
            <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b border-white/8 bg-background/80 backdrop-blur-md px-4">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground -ml-1" />
              <div className="h-4 w-px bg-white/10" />
              <div className="min-w-0 flex-1 h-full">
                <AppBreadcrumb />
              </div>
            </header>
            <main className="flex-1 min-h-0 min-w-0 overflow-hidden p-4 md:p-6">
              {children}
            </main>
          </SidebarInset>
        </SidebarProvider>
      </body>
    </html>
  );
}
