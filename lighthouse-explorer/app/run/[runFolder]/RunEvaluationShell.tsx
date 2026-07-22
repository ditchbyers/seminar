'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

type RunTabValue = 'overview' | 'iteration' | 'audit';

type RunEvaluationShellProps = {
  title: string;
  description: string;
  eyebrow: string;
  activeTab: RunTabValue;
  overviewHref: string;
  iterationHref: string;
  auditHref: string;
  dashboardHref?: string;
  summaryCards: Array<{
    title: string;
    value: string;
    detail: string;
  }>;
  children: ReactNode;
};

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function RunEvaluationShell({
  title,
  description,
  eyebrow,
  activeTab,
  overviewHref,
  iterationHref,
  auditHref,
  dashboardHref = '/',
  summaryCards,
  children,
}: RunEvaluationShellProps) {
  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col gap-5 overflow-hidden">
      <section className="rounded-xl border border-white/8 bg-card p-5">
        <p className="text-[10px] uppercase tracking-[0.28em] text-cyan-300/60">{eyebrow}</p>
        <h1 className="mt-1.5 text-2xl font-semibold text-foreground">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{description}</p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <Link href={dashboardHref} className="rounded border border-white/10 bg-white/4 px-3 py-1.5 text-muted-foreground hover:text-foreground hover:border-cyan-400/25 transition-colors">
            Back to overview dashboard
          </Link>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {summaryCards.map((card) => (
          <article key={card.title} className="rounded-xl border border-white/8 bg-card p-4">
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70">{card.title}</p>
            <p className="mt-1.5 text-2xl font-semibold text-foreground tabular-nums">{card.value}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">{card.detail}</p>
          </article>
        ))}
      </section>

      <section className="flex min-h-0 flex-1 flex-col rounded-xl border border-white/8 bg-card p-4">
        <Tabs value={activeTab} className="flex min-h-0 flex-1 flex-col">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/8 pb-3">
            <TabsList className="flex-wrap gap-1 bg-white/5 p-1">
              <TabsTrigger asChild value="overview">
                <Link href={overviewHref}>Summary</Link>
              </TabsTrigger>
              <TabsTrigger asChild value="iteration">
                <Link href={iterationHref}>Iteration View</Link>
              </TabsTrigger>
              <TabsTrigger asChild value="audit">
                <Link href={auditHref}>Audit View</Link>
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
            {children}
          </div>
        </Tabs>
      </section>
    </div>
  );
}