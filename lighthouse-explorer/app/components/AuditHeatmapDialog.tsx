'use client';

import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { AlertCircle, ChevronRight, LoaderCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import DataTable from '@/components/data-table';
import { cn } from '@/lib/utils';

function asNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : Number.NaN;
}

/** Formats a numeric audit value using whatever unit that audit actually reports
 * (ms, KiB, a raw count, etc.) instead of assuming everything is a time in ms —
 * many audits report savings in KiB or unitless counts, not milliseconds. */
function formatMetricValue(value: number, unit?: string): string {
  if (!Number.isFinite(value)) return 'n/a';
  const rounded = Math.round(value * 100) / 100;
  const trimmedUnit = unit?.trim();
  return trimmedUnit ? `${rounded} ${trimmedUnit}` : `${rounded}`;
}

export default function AuditHeatmapDialog({ open, onOpenChange, cell, data, loading, error }) {
  const occurrences = Array.isArray(data?.occurrences) ? data.occurrences : [];
  const [expandedAuditIds, setExpandedAuditIds] = useState<string[]>([]);

  function toggleAudit(auditId: string) {
    setExpandedAuditIds((current) => (current.includes(auditId)
      ? current.filter((entry) => entry !== auditId)
      : [...current, auditId]));
  }

  function toDetailRow(occurrence: any) {
    const scoreValue = asNumber(occurrence.score);
    const numericValue = asNumber(occurrence.numericValue);
    const runFolder = String(occurrence.runFolder ?? '');
    const iteration = Number(occurrence.iteration ?? Number.NaN);
    const auditId = String(occurrence.auditId ?? '');

    return {
      runFolder,
      iteration,
      auditId,
      title: String(occurrence.title ?? auditId),
      bucket: String(occurrence.bucket ?? 'unknown'),
      score: Number.isFinite(scoreValue) ? `${Math.round(scoreValue * 100)}%` : 'n/a',
      value: formatMetricValue(numericValue, String(occurrence.numericUnit ?? '')),
      displayValue: String(occurrence.displayValue ?? ''),
    };
  }

  const aggregatedRows = (() => {
    const grouped = new Map<string, {
      auditId: string;
      title: string;
      occurrences: number;
      failedCount: number;
      informativeCount: number;
      errorCount: number;
      manualCount: number;
      values: number[];
      unit: string;
      rawOccurrences: any[];
    }>();

    for (const occurrence of occurrences) {
      const key = String(occurrence.auditId ?? occurrence.title ?? 'unknown');
      const current = grouped.get(key) ?? {
        auditId: String(occurrence.auditId ?? ''),
        title: String(occurrence.title ?? key),
        occurrences: 0,
        failedCount: 0,
        informativeCount: 0,
        errorCount: 0,
        manualCount: 0,
        values: [],
        unit: '',
        rawOccurrences: [],
      };

      current.occurrences += 1;
      const bucket = String(occurrence.bucket ?? 'unknown');
      if (bucket === 'failed') current.failedCount += 1;
      if (bucket === 'informative') current.informativeCount += 1;
      if (bucket === 'error') current.errorCount += 1;
      if (bucket === 'manual') current.manualCount += 1;

      // Accumulate whatever numeric value this audit reports (ms, KiB, a raw count, …);
      // entries with no numeric outcome (e.g. plain failure-reason text) are simply
      // excluded from the mean rather than being coerced into a time value.
      const numericValue = asNumber(occurrence.numericValue);
      if (Number.isFinite(numericValue)) {
        current.values.push(numericValue);
        if (!current.unit) current.unit = String(occurrence.numericUnit ?? '');
      }

      current.rawOccurrences.push(occurrence);
      grouped.set(key, current);
    }

    return [...grouped.values()].map((row) => {
      const meanValue = row.values.length
        ? row.values.reduce((sum, value) => sum + value, 0) / row.values.length
        : Number.NaN;
      return {
        auditId: row.auditId,
        title: row.title,
        occurrences: row.occurrences,
        failed: row.failedCount,
        informative: row.informativeCount,
        errors: row.errorCount,
        manual: row.manualCount,
        meanValue: formatMetricValue(meanValue, row.unit),
        detailRows: row.rawOccurrences.map(toDetailRow),
      };
    }).sort((left, right) => right.occurrences - left.occurrences || left.title.localeCompare(right.title));
  })();

  const detailColumns = [
    { accessorKey: 'runFolder', header: 'Run' },
    { accessorKey: 'iteration', header: 'Iteration' },
    { accessorKey: 'bucket', header: 'Bucket' },
    { accessorKey: 'score', header: 'Score' },
    { accessorKey: 'value', header: 'Value' },
    { accessorKey: 'displayValue', header: 'Display Value' },
  ];

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-background/85 backdrop-blur-sm" />
        <Dialog.Content className="fixed inset-x-4 top-4 z-50 flex max-h-[calc(100vh-2rem)] flex-col overflow-hidden rounded-xl border border-white/10 bg-card shadow-2xl focus:outline-none md:inset-x-auto md:left-1/2 md:top-1/2 md:w-[min(1800px,calc(100vw-2rem))] md:-translate-x-1/2 md:-translate-y-1/2">
          <header className="flex items-start justify-between gap-4 border-b border-white/8 p-5">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.22em] text-cyan-300/60">Audit cell details</p>
              <Dialog.Title className="mt-1 text-xl font-semibold text-foreground text-balance">
                {cell ? `${cell.framework} / ${cell.preset}` : 'Lighthouse audits'}
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-muted-foreground break-all">
                {cell?.route ?? 'Select a populated heatmap cell to inspect its audits.'}
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <Button variant="outline" size="icon" className="shrink-0 border-white/10 bg-transparent" aria-label="Close audit details">
                <X className="h-4 w-4" />
              </Button>
            </Dialog.Close>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto p-5">
            {loading && (
              <div className="flex min-h-72 flex-col items-center justify-center gap-3" role="status">
                <LoaderCircle className="h-8 w-8 animate-spin text-cyan-300" />
                <p className="text-sm text-muted-foreground">Loading Lighthouse guidance…</p>
              </div>
            )}
            {!loading && error && (
              <div className="flex min-h-56 flex-col items-center justify-center gap-3 text-center">
                <AlertCircle className="h-8 w-8 text-destructive" />
                <p className="text-sm text-foreground">{error}</p>
              </div>
            )}
            {!loading && !error && data && (
              <div className="flex flex-col gap-5">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border border-white/8 bg-background/40 p-3"><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Samples</p><p className="mt-1 text-xl font-semibold tabular-nums">{data.sampleCount}</p></div>
                  <div className="rounded-lg border border-white/8 bg-background/40 p-3"><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Readable reports</p><p className="mt-1 text-xl font-semibold tabular-nums">{data.reportCount}</p></div>
                  <div className="rounded-lg border border-white/8 bg-background/40 p-3"><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Actionable audits</p><p className="mt-1 text-xl font-semibold tabular-nums">{data.occurrences.length}</p></div>
                </div>

                {occurrences.length ? (
                  <div className="flex flex-col gap-4">
                    <div>
                      <p className="mb-2 text-sm font-medium text-foreground">Audit Summary (Accumulated by Audit)</p>
                      <section className="overflow-hidden rounded-lg border border-white/8">
                        <div className="grid grid-cols-[24px_1.6fr_1fr_64px_64px_64px_64px_110px] items-center gap-2 border-b border-white/10 bg-white/5 px-3 py-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                          <span />
                          <span>Audit</span>
                          <span>Audit ID</span>
                          <span>Occ.</span>
                          <span>Failed</span>
                          <span>Info</span>
                          <span>Manual</span>
                          <span>Mean value</span>
                        </div>
                        <div className="divide-y divide-white/8">
                          {aggregatedRows.map((row) => {
                            const isOpen = expandedAuditIds.includes(row.auditId);
                            return (
                              <div key={row.auditId || row.title}>
                                <button
                                  type="button"
                                  onClick={() => toggleAudit(row.auditId)}
                                  aria-expanded={isOpen}
                                  className="grid w-full grid-cols-[24px_1.6fr_1fr_64px_64px_64px_64px_110px] items-center gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-white/5"
                                >
                                  <ChevronRight className={cn('h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform', isOpen && 'rotate-90')} />
                                  <span className="truncate text-foreground" title={row.title}>{row.title}</span>
                                  <span className="truncate text-muted-foreground" title={row.auditId}>{row.auditId}</span>
                                  <span className="tabular-nums text-foreground">{row.occurrences}</span>
                                  <span className="tabular-nums text-rose-300">{row.failed}</span>
                                  <span className="tabular-nums text-cyan-300">{row.informative}</span>
                                  <span className="tabular-nums text-muted-foreground">{row.manual}</span>
                                  <span className="tabular-nums text-foreground">{row.meanValue}</span>
                                </button>
                                {isOpen && (
                                  <div className="border-t border-white/8 bg-background/30 px-3 py-3">
                                    <DataTable
                                      title={`Entries contributing to "${row.title}"`}
                                      columns={detailColumns}
                                      data={row.detailRows}
                                      fileName={`audit-cell-${row.auditId || 'audit'}-entries.csv`}
                                      searchPlaceholder="Search entries..."
                                      defaultPageSize={5}
                                      compact
                                    />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </section>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-white/10 px-4 py-12 text-center text-sm text-muted-foreground">No failed or informative audits were found in the readable reports for this cell.</div>
                )}
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
