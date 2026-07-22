import Link from 'next/link';
import { notFound } from 'next/navigation';
import { formatDateTime } from '../../../lib/date-time';
import RunEvaluationShell from './RunEvaluationShell';
import RunSummaryCharts from './RunSummaryCharts';
import RunOverviewTable from './RunOverviewTable';
import RunContextTable from './RunContextTable';
import CategoryStatsTable from './CategoryStatsTable';
import AuditIndexTable from './AuditIndexTable';
import { fetchRunWorkspace } from '@/lib/lighthouse-api';

export const dynamic = 'force-dynamic';

function formatNumber(value: number, digits = 2) {
  return Number.isFinite(value) ? value.toFixed(digits) : 'n/a';
}

function formatScore(value: number) {
  return Number.isFinite(value) ? `${(value * 100).toFixed(1)}%` : 'n/a';
}

export default async function SingleRunPage({ params }: { params: Promise<{ runFolder: string }> }) {
  const resolvedParams = await params;
  const runFolder = decodeURIComponent(resolvedParams.runFolder ?? '');

  let workspace: any;
  try {
    workspace = await fetchRunWorkspace(runFolder);
  } catch {
    notFound();
  }

  if (!workspace) notFound();

  const uniqueFrameworks = new Set(workspace.rows.map((r: any) => `${r.framework}-${r.version}`));
  const uniqueRoutes = new Set(workspace.rows.map((r: any) => r.route));
  const uniquePresets = new Set(workspace.rows.map((r: any) => r.preset));
  const iterationCandidates = workspace.rows.map((r: any) => Number(r.iteration));
  const iterations: number[] = Array.from(new Set(iterationCandidates))
    .filter((value) => Number.isFinite(value))
    .map((value) => Number(value))
    .sort((a: number, b: number) => a - b);

  const overviewRows = workspace.rows.map((r: any) => ({
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

  const contextRows = [
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

  const categoryRows = workspace.categoryStats.map((c: any) => ({
    category: c.title,
    average: formatScore(c.scoreAvg),
    minimum: formatScore(c.scoreMin),
    maximum: formatScore(c.scoreMax),
  }));

  const auditRows = workspace.audits.map((a: any) => ({
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
    runFolder,
  }));

  const latestIteration = iterations[iterations.length - 1] ?? 1;
  const firstAuditId = workspace.audits[0]?.id ?? '';

  return (
    <RunEvaluationShell
      eyebrow="Single Run Diagnostic Workspace"
      title={`Run ${workspace.runFolder}`}
      description="Full-fidelity view of one benchmark run. Jump from summary to iteration-level analysis and audit details without leaving the run shell."
      activeTab="overview"
      overviewHref={`/run/${encodeURIComponent(workspace.runFolder)}`}
      iterationHref={`/run/${encodeURIComponent(workspace.runFolder)}/iteration/${latestIteration}`}
      auditHref={firstAuditId ? `/run/${encodeURIComponent(workspace.runFolder)}/audit/${encodeURIComponent(firstAuditId)}` : `/run/${encodeURIComponent(workspace.runFolder)}`}
      dashboardHref={`/?runs=${encodeURIComponent(workspace.runFolder)}&tab=summary`}
      summaryCards={[
        ['Rows', workspace.rows.length, 'Total measurements'],
        ['Frameworks', uniqueFrameworks.size, 'Distinct framework variants'],
        ['Routes', uniqueRoutes.size, 'Distinct tested routes'],
        ['Presets', uniquePresets.size, 'Mobile / desktop presets'],
        ['Run Warnings', workspace.runContext.runWarnings.length, 'Warnings in run context'],
      ].map(([title, value, detail]) => ({ title: String(title), value: String(value), detail: String(detail) }))}
    >
      <div className="space-y-5 min-w-0">
        <RunSummaryCharts rows={workspace.rows} />

        <div className="rounded-xl border border-white/8 bg-card p-4">
          <p className="text-[10px] uppercase tracking-[0.22em] text-cyan-300/60 mb-0.5">Drilldown</p>
          <h2 className="text-sm font-semibold text-foreground mb-3">Inspect a Single Measurement Pass</h2>
          <div className="flex flex-wrap gap-2">
            {iterations.map((iter: number) => (
              <Link
                key={`iter-${iter}`}
                href={`/run/${encodeURIComponent(workspace.runFolder)}/iteration/${iter}`}
                className="rounded border border-white/10 bg-white/4 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:border-cyan-400/25 transition-colors"
              >
                Iteration {iter}
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-white/8 bg-card p-4">
          <p className="text-[10px] uppercase tracking-[0.22em] text-cyan-300/60 mb-0.5">Reproducibility</p>
          <h2 className="text-sm font-semibold text-foreground mb-4">Run Context</h2>
          <RunContextTable rows={contextRows} />
        </div>

        <div className="rounded-xl border border-white/8 bg-card p-4">
          <p className="text-[10px] uppercase tracking-[0.22em] text-cyan-300/60 mb-0.5">Score envelope</p>
          <h2 className="text-sm font-semibold text-foreground mb-4">Category Score Envelope</h2>
          <CategoryStatsTable rows={categoryRows} />
        </div>

        <div className="rounded-xl border border-white/8 bg-card p-4">
          <p className="text-[10px] uppercase tracking-[0.22em] text-cyan-300/60 mb-0.5">Measurements</p>
          <h2 className="text-sm font-semibold text-foreground mb-4">General Overview Rows</h2>
          <RunOverviewTable rows={overviewRows} />
        </div>

        <div className="rounded-xl border border-white/8 bg-card p-4">
          <p className="text-[10px] uppercase tracking-[0.22em] text-cyan-300/60 mb-0.5">Diagnostics</p>
          <h2 className="text-sm font-semibold text-foreground mb-4">Audit Index</h2>
          <AuditIndexTable rows={auditRows} runFolder={runFolder} />
        </div>
      </div>
    </RunEvaluationShell>
  );
}
