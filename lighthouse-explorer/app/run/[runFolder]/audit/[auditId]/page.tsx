import Link from 'next/link';
import { notFound } from 'next/navigation';
import { formatDateTime } from '../../../../../lib/date-time';
import AuditOccurrencesTable from './AuditOccurrencesTable';
import AuditScopeCharts from './AuditScopeCharts';
import RunEvaluationShell from '../../RunEvaluationShell';
import { fetchAuditDetail, fetchRunWorkspace } from '@/lib/lighthouse-api';

export const dynamic = 'force-dynamic';

function formatNumber(value: number, digits = 2) {
  return Number.isFinite(value) ? value.toFixed(digits) : 'n/a';
}

function formatScore(value: number) {
  return Number.isFinite(value) ? `${(value * 100).toFixed(1)}%` : 'n/a';
}

function stringifyValue(value: unknown) {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try { return JSON.stringify(value); } catch { return String(value); }
}

export default async function AuditDetailPage({ params }: { params: Promise<{ runFolder: string; auditId: string }> }) {
  const resolvedParams = await params;
  const runFolder = decodeURIComponent(resolvedParams.runFolder ?? '');
  const auditId = decodeURIComponent(resolvedParams.auditId ?? '');

  let detail: any;
  let workspace: any;
  try {
    [workspace, detail] = await Promise.all([
      fetchRunWorkspace(runFolder),
      fetchAuditDetail(runFolder, auditId),
    ]);
  } catch {
    notFound();
  }

  if (!detail) notFound();

  if (!detail.occurrences.length) {
    return (
      <div className="space-y-4 min-w-0">
        <section className="rounded-xl border border-white/8 bg-card p-5">
          <h1 className="text-2xl font-semibold text-foreground">Audit {auditId} not found in run {runFolder}</h1>
          <Link href={`/run/${encodeURIComponent(runFolder)}`}
            className="mt-3 inline-block rounded border border-white/10 bg-white/4 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:border-cyan-400/25 transition-colors">
            Back to run workspace
          </Link>
        </section>
      </div>
    );
  }

  const meta = detail.auditMeta;

  const chartOccurrences = detail.occurrences.map((entry: any) => ({
    framework: entry.framework,
    route: entry.route,
    preset: entry.preset,
    iteration: entry.iteration,
    score: Number.isFinite(entry.score) ? entry.score : null,
    numericValue: Number.isFinite(entry.numericValue) ? entry.numericValue : null,
    numericUnit: entry.numericUnit,
  }));

  const occurrenceRows = detail.occurrences.map((entry: any) => ({
    key: entry.key,
    framework: entry.framework,
    route: entry.route,
    preset: entry.preset,
    iteration: entry.iteration,
    scoreMode: entry.scoreDisplayMode,
    score: Number.isFinite(entry.score) ? formatScore(entry.score) : 'n/a',
    numericValue: Number.isFinite(entry.numericValue)
      ? `${formatNumber(entry.numericValue, 2)} ${entry.numericUnit || ''}`.trim()
      : 'n/a',
    displayValue: entry.displayValue || 'n/a',
    detailsType: entry.detailsType,
    itemCount: entry.itemCount,
    jsonLink: entry.reportLinks.json,
    headings: entry.headings,
    items: entry.items,
    audit: entry.audit,
    timestamp: entry.timestamp,
  }));

  const iterations = Array.from(new Set((workspace?.rows ?? []).map((r: any) => Number(r.iteration))))
    .filter((value) => Number.isFinite(value))
    .map((value) => Number(value))
    .sort((a: number, b: number) => a - b);
  const firstAuditId = workspace?.audits?.[0]?.id ?? auditId;
  const latestIteration = iterations[iterations.length - 1] ?? 1;
  const auditOptions = (workspace?.audits ?? []).map((audit: any) => ({
    id: audit.id,
    title: audit.title,
    occurrences: audit.occurrences,
    failed: audit.failed,
    avgScore: audit.avgScore,
  }));

  return (
    <RunEvaluationShell
      eyebrow="Audit Deep Dive"
      title={meta?.title || auditId}
      description={meta?.description || `Detailed audit diagnostics for ${auditId}.`}
      activeTab="audit"
      overviewHref={`/run/${encodeURIComponent(runFolder)}`}
      iterationHref={`/run/${encodeURIComponent(runFolder)}/iteration/${latestIteration}`}
      auditHref={`/run/${encodeURIComponent(runFolder)}/audit/${encodeURIComponent(firstAuditId)}`}
      dashboardHref={`/?runs=${encodeURIComponent(runFolder)}&tab=heatmap`}
      summaryCards={[
        ['Occurrences', detail.occurrences.length, 'Times this audit appeared'],
        ['Failures', meta?.failed ?? 0, 'Failure occurrences'],
        ['Avg Score', formatScore(meta?.avgScore), 'Average audit score'],
        ['FCP Savings', `${formatNumber(meta?.savingsFcpMs, 0)} ms`, 'Potential FCP improvement'],
        ['LCP Savings', `${formatNumber(meta?.savingsLcpMs, 0)} ms`, 'Potential LCP improvement'],
      ].map(([title, value, detail]) => ({ title: String(title), value: String(value), detail: String(detail) }))}
    >
      <div className="space-y-5 min-w-0">
        <AuditScopeCharts
          runFolder={runFolder}
          currentAuditId={auditId}
          auditOptions={auditOptions}
          occurrences={chartOccurrences}
        />

        <div className="rounded-xl border border-white/8 bg-card p-4">
          <p className="text-[10px] uppercase tracking-[0.22em] text-cyan-300/60 mb-0.5">General overview</p>
          <h2 className="text-sm font-semibold text-foreground mb-4">Audit Occurrences</h2>
          <AuditOccurrencesTable rows={occurrenceRows} />
        </div>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Occurrence Details</h2>
          {detail.occurrences.map((entry: any) => (
            <details key={`detail-${entry.key}`}
              className="rounded-xl border border-white/8 bg-card p-4 group">
              <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground transition-colors list-none flex items-center gap-2">
                <span className="h-4 w-4 flex-none rounded border border-white/10 flex items-center justify-center text-[10px] group-open:border-cyan-400/30">▸</span>
                {entry.framework} · {entry.route} · {entry.preset} · iter {entry.iteration} · {entry.detailsType}
              </summary>
              <div className="mt-3 space-y-3">
                <p className="text-xs text-muted-foreground">
                  {formatDateTime(entry.timestamp)} · Mode: {entry.scoreDisplayMode} · Score: {Number.isFinite(entry.score) ? formatScore(entry.score) : 'n/a'}
                </p>

                {entry.headings?.length > 0 && entry.items?.length > 0 ? (
                  <div className="overflow-x-auto rounded-lg border border-white/8 bg-card/60">
                    <table className="min-w-full border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-white/8">
                          {entry.headings.map((h: any, i: number) => (
                            <th key={`${h.key}-${i}`}
                              className="py-2 px-3 text-left text-muted-foreground font-medium whitespace-nowrap">
                              {h.label || h.key || `col-${i + 1}`}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {entry.items.slice(0, 200).map((item: any, ri: number) => (
                          <tr key={ri} className="border-b border-white/5 align-top">
                            {entry.headings.map((h: any, ci: number) => (
                              <td key={`${ri}-${h.key}-${ci}`}
                                className="py-1.5 px-3 text-foreground/80 break-all">
                                {stringifyValue(item?.[h.key])}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {entry.items.length > 200 && (
                      <p className="px-3 py-2 text-[11px] text-muted-foreground">
                        Showing first 200 of {entry.items.length} rows. Open the raw JSON for full detail.
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No tabular detail items for this occurrence.</p>
                )}

                <details className="rounded-lg border border-white/8 bg-card/60 p-3">
                  <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">Raw audit JSON</summary>
                  <pre className="mt-2 max-h-96 overflow-auto whitespace-pre-wrap break-all text-[11px] text-muted-foreground/80 font-mono">
                    {JSON.stringify(entry.audit, null, 2)}
                  </pre>
                </details>
              </div>
            </details>
          ))}
        </section>
      </div>
    </RunEvaluationShell>
  );
}
