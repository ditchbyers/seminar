'use client';

import { useEffect, useMemo, useState } from 'react';
import { formatDateTime } from '@/lib/date-time';
import { fetchRunWorkspace } from '@/lib/lighthouse-api';
import RunContextTable from '../run/[runFolder]/RunContextTable';
import CategoryStatsTable from '../run/[runFolder]/CategoryStatsTable';
import RunOverviewTable from '../run/[runFolder]/RunOverviewTable';
import HomepageAuditIndexTable from './HomepageAuditIndexTable';

function formatNumber(value: number, digits = 2) {
  return Number.isFinite(value) ? value.toFixed(digits) : 'n/a';
}

function formatScore(value: number) {
  return Number.isFinite(value) ? `${(value * 100).toFixed(1)}%` : 'n/a';
}

export default function HomepageRunDrilldown({ runFolder, onSelectAudit }: { runFolder: string; onSelectAudit?: (auditId: string) => void }) {
  const [workspace, setWorkspace] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const next = await fetchRunWorkspace(runFolder);
        if (!active) return;
        setWorkspace(next);
      } catch (loadError) {
        if (!active) return;
        setWorkspace(null);
        setError(loadError instanceof Error ? loadError.message : 'Unable to load run drilldown.');
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [runFolder]);

  const contextRows = useMemo(() => {
    if (!workspace) return [];
    return [
      ['Lighthouse version', workspace.runContext.lighthouseVersion],
      ['Fetch time', formatDateTime(workspace.runContext.fetchTime)],
      ['Gather mode', workspace.runContext.gatherMode],
      ['Requested URL', workspace.runContext.requestedUrl],
      ['Final URL', workspace.runContext.finalUrl],
      ['Form factor', workspace.runContext.formFactor],
      ['Throttling method', workspace.runContext.throttlingMethod],
      ['Benchmark index', formatNumber(workspace.runContext.benchmarkIndex, 0)],
      ['User agent', workspace.runContext.userAgent],
    ].map(([label, value]) => ({ label, value: value || 'n/a' }));
  }, [workspace]);

  const categoryRows = useMemo(() => {
    if (!workspace) return [];
    return workspace.categoryStats.map((c: any) => ({
      category: c.title,
      average: formatScore(c.scoreAvg),
      minimum: formatScore(c.scoreMin),
      maximum: formatScore(c.scoreMax),
    }));
  }, [workspace]);

  const overviewRows = useMemo(() => {
    if (!workspace) return [];
    return workspace.rows.map((r: any) => ({
      framework: `${r.framework}-${r.version}`,
      route: r.route,
      preset: r.preset,
      iteration: r.iteration,
      performance: formatScore(r.performanceScore),
      fcp: `${formatNumber(r.firstContentfulPaintMs, 0)} ms`,
      lcp: `${formatNumber(r.largestContentfulPaintMs, 0)} ms`,
      tbt: `${formatNumber(r.totalBlockingTimeMs, 0)} ms`,
      cls: formatNumber(r.cumulativeLayoutShift, 3),
      warnings: r.runWarningCount,
      json: r.jsonReportRelativePath,
      html: r.htmlReportRelativePath,
      csv: r.csvReportRelativePath,
    }));
  }, [workspace]);

  const auditRows = useMemo(() => {
    if (!workspace) return [];
    return workspace.audits.map((a: any) => ({
      id: a.id,
      title: a.title,
      mode: a.scoreDisplayMode,
      categoryRefs: a.categoryRefs,
      occurrences: a.occurrences,
      failures: a.failed,
      items: a.itemsTotal,
      avgScore: Number.isFinite(a.avgScore) ? formatScore(a.avgScore) : 'n/a',
      savingsFcp: `${formatNumber(a.savingsFcpMs, 0)} ms`,
      savingsLcp: `${formatNumber(a.savingsLcpMs, 0)} ms`,
    }));
  }, [workspace]);

  if (loading) {
    return (
      <section className="rounded-xl border border-white/8 bg-card p-4">
        <p className="text-xs text-muted-foreground">Loading run drilldown for {runFolder}...</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-4">
        <p className="text-xs font-medium text-rose-200">Could not load run drilldown.</p>
        <p className="mt-1 break-all text-xs text-rose-100/80">{error}</p>
      </section>
    );
  }

  if (!workspace) return null;

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-white/8 bg-card p-4">
        <p className="mb-0.5 text-[10px] uppercase tracking-[0.22em] text-cyan-300/60">Reproducibility</p>
        <h2 className="mb-4 text-sm font-semibold text-foreground">Run Context</h2>
        <RunContextTable rows={contextRows} />
      </section>

      <section className="rounded-xl border border-white/8 bg-card p-4">
        <p className="mb-0.5 text-[10px] uppercase tracking-[0.22em] text-cyan-300/60">Score envelope</p>
        <h2 className="mb-4 text-sm font-semibold text-foreground">Category Score Envelope</h2>
        <CategoryStatsTable rows={categoryRows} />
      </section>

      <section className="rounded-xl border border-white/8 bg-card p-4">
        <p className="mb-0.5 text-[10px] uppercase tracking-[0.22em] text-cyan-300/60">Measurements</p>
        <h2 className="mb-4 text-sm font-semibold text-foreground">General Overview Rows</h2>
        <RunOverviewTable rows={overviewRows} />
      </section>

      <section className="rounded-xl border border-white/8 bg-card p-4">
        <p className="mb-0.5 text-[10px] uppercase tracking-[0.22em] text-cyan-300/60">Diagnostics</p>
        <h2 className="mb-4 text-sm font-semibold text-foreground">Audit Index</h2>
        <HomepageAuditIndexTable rows={auditRows} onSelectAudit={onSelectAudit} />
      </section>
    </div>
  );
}
