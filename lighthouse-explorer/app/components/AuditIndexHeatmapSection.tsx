'use client';

import { useMemo, useState } from 'react';
import PlotCard from '@/components/plot-card';
import AuditHeatmapDialog from './AuditHeatmapDialog';
import GlobalFiltersPanel from './GlobalFiltersPanel';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { aggregateBy, frameworkKey, mean } from '@/lib/aggregation';
import { useDashboardStore } from '@/lib/dashboard-store';
import { apiBaseUrl, type LighthouseFilterState, type LighthouseRow } from '@/lib/lighthouse-api';

export const DIAGNOSTIC_METRICS = [
  ['failedAudits', 'Failed audits (avg)'],
  ['diagnosticsItemCount', 'Diagnostics items (avg)'],
  ['insightAuditCount', 'Insights (avg)'],
  ['fcpImprovementMs', 'FCP improvement potential (ms)'],
  ['lcpImprovementMs', 'LCP improvement potential (ms)'],
  ['performanceGainPotential', 'Performance gain potential'],
] as const;

export type DiagnosticMetric = (typeof DIAGNOSTIC_METRICS)[number][0];

export default function AuditIndexHeatmapSection({
  rows,
  filters,
  showTopFiltersCard = true,
  diagnosticHeatMetric: controlledDiagnosticHeatMetric,
  onDiagnosticHeatMetricChange,
}: {
  rows: LighthouseRow[];
  filters: LighthouseFilterState;
  showTopFiltersCard?: boolean;
  diagnosticHeatMetric?: DiagnosticMetric;
  onDiagnosticHeatMetricChange?: (metric: DiagnosticMetric) => void;
}) {
  const selectedAuditId = useDashboardStore((state) => state.selectedAuditId);
  const [diagnosticHeatMetricState, setDiagnosticHeatMetricState] = useState<DiagnosticMetric>('failedAudits');
  const [auditCell, setAuditCell] = useState<null | { framework: string; preset: string; route: string }>(null);
  const [auditCellData, setAuditCellData] = useState<any>(null);
  const [auditCellLoading, setAuditCellLoading] = useState(false);
  const [auditCellError, setAuditCellError] = useState('');

  const diagnosticHeatMetric = controlledDiagnosticHeatMetric ?? diagnosticHeatMetricState;

  function setDiagnosticHeatMetric(nextMetric: DiagnosticMetric) {
    if (controlledDiagnosticHeatMetric === undefined) {
      setDiagnosticHeatMetricState(nextMetric);
    }
    onDiagnosticHeatMetricChange?.(nextMetric);
  }

  const diagnosticHeatmap = useMemo(() => {
    if (!rows.length) return { x: [], y: [], z: [], hover: [] };

    const rpGroups = aggregateBy(rows, (row) => `${row.route}|${row.preset}`);
    const bests = new Map<string, { minFcp: number; minLcp: number; maxPerf: number }>();
    for (const [key, groupedRows] of rpGroups.entries()) {
      bests.set(key, {
        minFcp: Math.min(...groupedRows.map((row) => Number(row.firstContentfulPaintMs)).filter(Number.isFinite)),
        minLcp: Math.min(...groupedRows.map((row) => Number(row.largestContentfulPaintMs)).filter(Number.isFinite)),
        maxPerf: Math.max(...groupedRows.map((row) => Number(row.performanceScore)).filter(Number.isFinite)),
      });
    }

    const groupByCell = aggregateBy(rows, (row) => `${frameworkKey(row)}|${row.route}|${row.preset}`);
    const x = Array.from(new Set(rows.map((row) => `${frameworkKey(row)} / ${row.preset}`))).sort();
    const y = Array.from(new Set(rows.map((row) => row.route))).sort();

    const z = y.map((route) => x.map((fp) => {
      const [framework, preset] = fp.split(' / ');
      const key = `${framework}|${route}|${preset}`;
      const groupedRows = groupByCell.get(key) ?? [];
      if (!groupedRows.length) return Number.NaN;
      const values = groupedRows.map((row) => {
        if (diagnosticHeatMetric === 'fcpImprovementMs') {
          const best = bests.get(`${row.route}|${row.preset}`);
          return best ? Number(row.firstContentfulPaintMs) - best.minFcp : Number.NaN;
        }
        if (diagnosticHeatMetric === 'lcpImprovementMs') {
          const best = bests.get(`${row.route}|${row.preset}`);
          return best ? Number(row.largestContentfulPaintMs) - best.minLcp : Number.NaN;
        }
        if (diagnosticHeatMetric === 'performanceGainPotential') {
          const best = bests.get(`${row.route}|${row.preset}`);
          return best ? best.maxPerf - Number(row.performanceScore) : Number.NaN;
        }
        return Number(row[diagnosticHeatMetric]);
      }).filter(Number.isFinite);
      return values.length ? mean(values) : Number.NaN;
    }));

    const hover = y.map((route) => x.map((fp) => {
      const [framework, preset] = fp.split(' / ');
      const key = `${framework}|${route}|${preset}`;
      const groupedRows = groupByCell.get(key) ?? [];
      if (!groupedRows.length) return 'No data';
      return [`<b>${fp}</b>`, `Route: ${route}`, `Samples: ${groupedRows.length}`,
        `Avg failed: ${mean(groupedRows.map((row) => Number(row.failedAudits)).filter(Number.isFinite)).toFixed(2)}`,
        `Avg FCP: ${mean(groupedRows.map((row) => Number(row.firstContentfulPaintMs)).filter(Number.isFinite)).toFixed(0)} ms`,
        `Avg Perf: ${(mean(groupedRows.map((row) => Number(row.performanceScore)).filter(Number.isFinite)) * 100).toFixed(1)}%`,
      ].join('<br>');
    }));

    return { x, y, z, hover };
  }, [diagnosticHeatMetric, rows]);

  async function openAuditCell(event: any) {
    const point = event?.points?.[0];
    if (typeof point?.x !== 'string' || typeof point?.y !== 'string') return;
    const separatorIndex = point.x.lastIndexOf(' / ');
    if (separatorIndex < 0) return;
    const cell = {
      framework: point.x.slice(0, separatorIndex),
      preset: point.x.slice(separatorIndex + 3),
      route: point.y,
    };
    setAuditCell(cell);
    setAuditCellData(null);
    setAuditCellError('');
    setAuditCellLoading(true);
    try {
      const query = new URLSearchParams(cell);
      const response = await fetch(`${apiBaseUrl()}/api/lighthouse/heatmap-cell?${query.toString()}`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Unable to load audit details.');
      setAuditCellData(payload);
    } catch (error) {
      setAuditCellError(error instanceof Error ? error.message : 'Unable to load audit details.');
    } finally {
      setAuditCellLoading(false);
    }
  }

  return (
    <section className="flex h-full min-h-0 flex-col rounded-xl border border-white/8 bg-card p-4">
      <div className="mb-4">
        <p className="text-[10px] uppercase tracking-[0.22em] text-cyan-300/60 mb-0.5">Cross-run analysis</p>
        <h2 className="text-sm font-semibold text-foreground">Audit Index Heatmap</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">Framework × route heatmap showing where failures and improvements cluster.</p>
        {selectedAuditId && (
          <p className="mt-1 text-xs text-cyan-200/80">Selected audit from summary drilldown: {selectedAuditId}</p>
        )}
      </div>

      {showTopFiltersCard && (
      <div className="sticky top-0 z-20 mb-4 rounded-xl border border-white/8 bg-card/95 p-3 backdrop-blur-md">
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_320px]">
          <GlobalFiltersPanel filters={filters} className="w-full rounded-lg border border-white/8 bg-background/20 p-3" />
          <section className="rounded-lg border border-white/8 bg-background/20 p-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-muted-foreground">Heatmap metric</label>
              <Select value={diagnosticHeatMetric} onValueChange={(value) => setDiagnosticHeatMetric(value as DiagnosticMetric)}>
              <SelectTrigger className="w-full border-white/10 bg-card text-xs text-foreground focus:ring-cyan-400/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border-white/10 text-xs">
                {DIAGNOSTIC_METRICS.map(([value, label]) => (
                  <SelectItem key={value} value={value} className="text-xs focus:bg-white/8">{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            </div>
          </section>
        </div>
      </div>
      )}

      <div className="min-h-0 flex-1">
        <PlotCard
          exportName={`audit-heatmap-${diagnosticHeatMetric}`}
          data={[{ type: 'heatmap', x: diagnosticHeatmap.x, y: diagnosticHeatmap.y, z: diagnosticHeatmap.z, text: diagnosticHeatmap.hover, colorscale: 'Magma', hovertemplate: '%{text}<br>Value: %{z:.3f}<extra></extra>' }]}
          layout={{
            xaxis: { automargin: true, tickangle: -30, title: 'Framework / platform' },
            yaxis: { automargin: true, title: 'Route' },
            margin: { t: 12, r: 16, l: 150, b: 130 },
          }}
          config={{ modeBarButtonsToAdd: [] }}
          onClick={openAuditCell}
          height="100%"
          fillHeight
          className="border-0 bg-transparent p-0 flex-1 min-h-0"
        />
      </div>
      <AuditHeatmapDialog
        open={Boolean(auditCell)}
        onOpenChange={(open) => { if (!open) setAuditCell(null); }}
        cell={auditCell}
        data={auditCellData}
        loading={auditCellLoading}
        error={auditCellError}
      />
    </section>
  );
}