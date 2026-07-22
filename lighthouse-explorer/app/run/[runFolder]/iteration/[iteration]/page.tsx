import { notFound } from 'next/navigation';
import RunEvaluationShell from '../../RunEvaluationShell';
import IterationTable from './IterationTable';
import IterationScopeCharts from './IterationScopeCharts';
import { fetchRunIteration, fetchRunWorkspace } from '@/lib/lighthouse-api';

export const dynamic = 'force-dynamic';

function average(rows: any[], field: string) {
  const values = rows.map((r) => Number(r[field])).filter(Number.isFinite);
  return values.length ? values.reduce((s, v) => s + v, 0) / values.length : Number.NaN;
}

function format(value: number, digits = 0) {
  return Number.isFinite(value) ? value.toFixed(digits) : 'n/a';
}

export default async function IterationPage({ params }: { params: Promise<{ runFolder: string; iteration: string }> }) {
  const resolvedParams = await params;
  const runFolder = decodeURIComponent(resolvedParams.runFolder ?? '');
  const iteration = Number(resolvedParams.iteration);

  let payload: any;
  let workspace: any;
  try {
    [workspace, payload] = await Promise.all([
      fetchRunWorkspace(runFolder),
      fetchRunIteration(runFolder, iteration),
    ]);
  } catch {
    notFound();
  }

  const rows = payload?.rows ?? [];
  if (!rows.length || !Number.isInteger(iteration)) notFound();

  const frameworks = new Set(rows.map((r: any) => `${r.framework}-${r.version}`));
  const routes = new Set(rows.map((r: any) => r.route));
  const avgPerformance = average(rows, 'performanceScore') * 100;
  const avgLcp = average(rows, 'largestContentfulPaintMs');
  const avgTbt = average(rows, 'totalBlockingTimeMs');

  const tableRows = rows.map((r: any) => ({
    framework: `${r.framework}-${r.version}`,
    route: r.route,
    preset: r.preset,
    score: `${format(r.performanceScore * 100, 1)}%`,
    fcp: `${format(r.firstContentfulPaintMs)} ms`,
    lcp: `${format(r.largestContentfulPaintMs)} ms`,
    tbt: `${format(r.totalBlockingTimeMs)} ms`,
    cls: format(r.cumulativeLayoutShift, 3),
    mainThread: `${format(r.mainThreadWorkMs)} ms`,
    transfer: `${format(r.totalByteWeight / 1024)} KB`,
  }));

  const iterations = Array.from(new Set((workspace?.rows ?? []).map((r: any) => Number(r.iteration))))
    .filter((value) => Number.isFinite(value))
    .map((value) => Number(value))
    .sort((a: number, b: number) => a - b);
  const firstAuditId = workspace?.audits?.[0]?.id ?? '';

  return (
    <RunEvaluationShell
      eyebrow="Run-scoped iteration"
      title={`Iteration ${iteration}`}
      description={`Framework, category, timing, and route signals for run ${runFolder}.`}
      activeTab="iteration"
      overviewHref={`/run/${encodeURIComponent(runFolder)}`}
      iterationHref={`/run/${encodeURIComponent(runFolder)}/iteration/${iteration}`}
      auditHref={firstAuditId ? `/run/${encodeURIComponent(runFolder)}/audit/${encodeURIComponent(firstAuditId)}` : `/run/${encodeURIComponent(runFolder)}`}
      summaryCards={[
        ['Measurements', rows.length, `${frameworks.size} frameworks · ${routes.size} routes`],
        ['Performance', `${format(avgPerformance, 1)}%`, 'Average Lighthouse score'],
        ['LCP', `${format(avgLcp)} ms`, 'Average largest paint'],
        ['TBT', `${format(avgTbt)} ms`, 'Average blocking time'],
        ['Transfer', `${format(average(rows, 'totalByteWeight') / 1024)} KB`, 'Average page weight'],
      ].map(([title, value, detail]) => ({ title: String(title), value: String(value), detail: String(detail) }))}
    >
      <div className="space-y-5 min-w-0">
        <IterationScopeCharts rows={workspace.rows} iterations={iterations} currentIteration={iteration} />

        <div className="rounded-xl border border-white/8 bg-card p-4">
          <p className="text-[10px] uppercase tracking-[0.22em] text-cyan-300/60 mb-0.5">Route breakdown</p>
          <h2 className="text-sm font-semibold text-foreground mb-4">Individual Measurements</h2>
          <IterationTable rows={tableRows} />
        </div>
      </div>
    </RunEvaluationShell>
  );
}
