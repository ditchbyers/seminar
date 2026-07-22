'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { useDashboardStore } from '@/lib/dashboard-store';

const SEGMENT_LABELS = {
  runs: 'Run Catalog',
  run: 'Run',
  wiki: 'Wiki',
  metrics: 'Metrics',
  statistics: 'Statistics',
  frameworks: 'Frameworks',
  methodology: 'Methodology',
  audit: 'Audit',
  iteration: 'Iteration',
} as const;

function labelFromSegment(segment: string): string {
  const decoded = decodeURIComponent(segment);
  if (decoded in SEGMENT_LABELS) return SEGMENT_LABELS[decoded as keyof typeof SEGMENT_LABELS];
  // date-folder like 2024-01-15_... → shorten
  if (/^\d{4}-\d{2}-\d{2}/.test(decoded)) return decoded.slice(0, 10);
  return decoded.replace(/[-_]/g, ' ').replace(/\b\w/g, (char: string) => char.toUpperCase());
}

export default function AppBreadcrumb() {
  const pathname = usePathname();
  const headerKpis = useDashboardStore((state) => state.headerKpis);
  const segments = pathname.split('/').filter(Boolean);

  const showHeaderKpis = pathname === '/' && Boolean(headerKpis);

  if (!segments.length) {
    return (
      <div className="h-14 flex w-full min-w-0 items-center justify-between gap-3">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage className="text-foreground font-medium text-sm">Overview Dashboard</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {showHeaderKpis && headerKpis && (
          <div className="hidden items-center gap-2 lg:flex">
            <div className="flex h-10 min-w-[78px] flex-col justify-center rounded border border-white/10 bg-white/5 px-2">
              <span className="text-[9px] uppercase tracking-[0.12em] text-muted-foreground">Runs</span>
              <span className="text-xs font-semibold text-foreground">{headerKpis.runs}</span>
            </div>
            <div className="flex h-10 min-w-[92px] flex-col justify-center rounded border border-white/10 bg-white/5 px-2">
              <span className="text-[9px] uppercase tracking-[0.12em] text-muted-foreground">Frameworks</span>
              <span className="text-xs font-semibold text-foreground">{headerKpis.frameworks}</span>
            </div>
            <div className="flex h-10 min-w-[86px] flex-col justify-center rounded border border-white/10 bg-white/5 px-2">
              <span className="text-[9px] uppercase tracking-[0.12em] text-muted-foreground">Platforms</span>
              <span className="text-xs font-semibold text-foreground">{headerKpis.presets}</span>
            </div>
            <div className="flex h-10 min-w-[78px] flex-col justify-center rounded border border-white/10 bg-white/5 px-2">
              <span className="text-[9px] uppercase tracking-[0.12em] text-muted-foreground">Routes</span>
              <span className="text-xs font-semibold text-foreground">{headerKpis.routes}</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  const crumbs = segments.map((segment, index) => {
    const href = '/' + segments.slice(0, index + 1).join('/');
    const label = labelFromSegment(segment);
    const isLast = index === segments.length - 1;
    return { href, label, isLast };
  });

  return (
    <div className="flex h-full w-full min-w-0 items-center justify-between gap-3">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild className="text-muted-foreground hover:text-foreground text-sm">
              <Link href="/">Home</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          {crumbs.map((crumb) => (
            <span key={crumb.href} className="flex items-center gap-1.5">
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {crumb.isLast ? (
                  <BreadcrumbPage className="text-foreground font-medium text-sm max-w-50 truncate">
                    {crumb.label}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild className="text-muted-foreground hover:text-foreground text-sm">
                    <Link href={crumb.href}>{crumb.label}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </span>
          ))}
        </BreadcrumbList>
      </Breadcrumb>

      {showHeaderKpis && headerKpis && (
        <div className="hidden items-center gap-2 lg:flex">
          <div className="flex h-10 min-w-[78px] flex-col justify-center rounded border border-white/10 bg-white/5 px-2">
            <span className="text-[9px] uppercase tracking-[0.12em] text-muted-foreground">Runs</span>
            <span className="text-xs font-semibold text-foreground">{headerKpis.runs}</span>
          </div>
          <div className="flex h-10 min-w-[92px] flex-col justify-center rounded border border-white/10 bg-white/5 px-2">
            <span className="text-[9px] uppercase tracking-[0.12em] text-muted-foreground">Frameworks</span>
            <span className="text-xs font-semibold text-foreground">{headerKpis.frameworks}</span>
          </div>
          <div className="flex h-10 min-w-[86px] flex-col justify-center rounded border border-white/10 bg-white/5 px-2">
            <span className="text-[9px] uppercase tracking-[0.12em] text-muted-foreground">Platforms</span>
            <span className="text-xs font-semibold text-foreground">{headerKpis.presets}</span>
          </div>
          <div className="flex h-10 min-w-[78px] flex-col justify-center rounded border border-white/10 bg-white/5 px-2">
            <span className="text-[9px] uppercase tracking-[0.12em] text-muted-foreground">Routes</span>
            <span className="text-xs font-semibold text-foreground">{headerKpis.routes}</span>
          </div>
        </div>
      )}
    </div>
  );
}
