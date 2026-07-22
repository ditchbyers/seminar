'use client';

import { ChevronRight } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { formatDateTime, formatRunFolderDateTime } from '../../lib/date-time';
import { METRIC_META, PRIMARY_METRICS, formatMetricValue } from '@/lib/metric-meta';
import PlotCard from '@/components/plot-card';
import DataTable from '@/components/data-table';
import AuditHeatmapDialog from './AuditHeatmapDialog';
import GlobalFiltersPanel from './GlobalFiltersPanel';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MultiSelectCombobox } from '@/components/ui/multi-select-combobox';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { apiBaseUrl } from '@/lib/lighthouse-api';
import { frameworkVersionColor } from '@/lib/framework-colors';
import { aggregateBy, frameworkKey } from '@/lib/aggregation';

// ── helpers ───────────────────────────────────────────────────────────────────

const CHART_TYPES = ['line', 'scatter', 'bar', 'box', 'violin', 'histogram', 'heatmap'];
type TrendSelections = Record<string, string[]>;
type TrendBasis = 'iteration' | 'run';
type TrendChartType = typeof CHART_TYPES[number];

function formatMetric(metric, value) {
  return formatMetricValue(metric, value);
}

function percentile(sorted, frac) {
  if (!sorted.length) return Number.NaN;
  if (sorted.length === 1) return sorted[0];
  const pos = (sorted.length - 1) * frac;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return lo === hi ? sorted[lo] : sorted[lo] * (1 - (pos - lo)) + sorted[hi] * (pos - lo);
}

function summarize(metric, values) {
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const mean = sorted.reduce((s, v) => s + v, 0) / n;
  const stdDev = n > 1 ? Math.sqrt(sorted.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1)) : 0;
  return {
    metric, n, mean,
    median: percentile(sorted, 0.5), stdDev,
    min: sorted[0], max: sorted[n - 1],
    p90: percentile(sorted, 0.9), p95: percentile(sorted, 0.95),
    iqr: percentile(sorted, 0.75) - percentile(sorted, 0.25),
  };
}

function uniqueValues<T>(items: T[]): T[] { return [...new Set(items)]; }

function frameworkPresetKey(row) { return `${frameworkKey(row)}|${row.preset}`; }
function rowKey(row) { return `${row.runFolder}|${row.framework}|${row.version}|${row.preset}|${row.route}|${row.iteration}`; }
function seriesName(row) { return `${frameworkKey(row)} / ${row.preset}`; }
function displayRunFolder(v) { return formatRunFolderDateTime(v); }

function clampColor(n) {
  return Math.max(0, Math.min(255, Math.round(n)));
}

function parseHexColor(hex) {
  const raw = String(hex).replace('#', '');
  if (raw.length !== 6) return { r: 128, g: 128, b: 128 };
  return {
    r: parseInt(raw.slice(0, 2), 16),
    g: parseInt(raw.slice(2, 4), 16),
    b: parseInt(raw.slice(4, 6), 16),
  };
}

function toHexColor(r, g, b) {
  return `#${clampColor(r).toString(16).padStart(2, '0')}${clampColor(g).toString(16).padStart(2, '0')}${clampColor(b).toString(16).padStart(2, '0')}`;
}

function shiftHexColor(hex, factor) {
  const { r, g, b } = parseHexColor(hex);
  if (factor >= 0) {
    return toHexColor(
      r + (255 - r) * factor,
      g + (255 - g) * factor,
      b + (255 - b) * factor,
    );
  }
  const amount = Math.abs(factor);
  return toHexColor(
    r * (1 - amount),
    g * (1 - amount),
    b * (1 - amount),
  );
}

function tokensFromPlotEvent(event: any): string[] {
  if (!event?.points?.length) return [];
  const tokens = event.points.flatMap((p) => {
    if (typeof p.customdata === 'string' && p.customdata) return [p.customdata];
    if (Array.isArray(p.customdata)) return p.customdata.filter((v) => typeof v === 'string' && v);
    if (typeof p.label === 'string' && p.label) return [p.label];
    if (Number.isFinite(p.x)) return [String(p.x)];
    if (typeof p.x === 'string' && p.x) return [p.x];
    return [];
  });
  return uniqueValues(tokens);
}

function makeSeriesHover(row, metricLabel, metricValue) {
  return [
    `<b>${seriesName(row)}</b>`,
    `Run: ${displayRunFolder(row.runFolder)}`,
    `Route: ${row.route}`,
    `Iteration: ${row.iteration}`,
    `${metricLabel}: ${metricValue}`,
  ].join('<br>');
}

function artifactHref(path) {
  return `${apiBaseUrl()}/api/lighthouse/artifact?file=${encodeURIComponent(path)}&disposition=inline`;
}

// ── KPI card ─────────────────────────────────────────────────────────────────

function KpiCard({ title, value, detail }) {
  return (
    <article className="rounded-xl border border-white/8 bg-card p-4">
      <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground/70">{title}</p>
      <p className="mt-1.5 text-2xl font-semibold text-foreground tabular-nums">{value}</p>
      {detail && <p className="mt-0.5 text-[11px] text-muted-foreground leading-snug">{detail}</p>}
    </article>
  );
}

// ── column helpers ────────────────────────────────────────────────────────────

function colDef(accessorKey, header, opts = {}) {
  return { accessorKey, header, enableSorting: true, ...opts };
}

// ── main component ────────────────────────────────────────────────────────────

export default function LighthouseExplorer({
  dataset,
  filters,
  initialSelection,
  showHeader = true,
  showKpis = true,
  showStatsTable = true,
  showAuditHeatmap = true,
  showTopFiltersCard = true,
  trendMetric: controlledTrendMetric,
  onTrendMetricChange,
  trendChartType: controlledTrendChartType,
  onTrendChartTypeChange,
  trendBasis: controlledTrendBasis,
  onTrendBasisChange,
  selectedIterations: controlledSelectedIterations,
  onSelectedIterationsChange,
}: {
  dataset: any;
  filters: any;
  initialSelection: any;
  showHeader?: boolean;
  showKpis?: boolean;
  showStatsTable?: boolean;
  showAuditHeatmap?: boolean;
  showTopFiltersCard?: boolean;
  trendMetric?: string;
  onTrendMetricChange?: (metric: string) => void;
  trendChartType?: TrendChartType;
  onTrendChartTypeChange?: (chartType: TrendChartType) => void;
  trendBasis?: TrendBasis;
  onTrendBasisChange?: (basis: TrendBasis) => void;
  selectedIterations?: number[];
  onSelectedIterationsChange?: (iterations: number[]) => void;
}) {
  const [trendMetricState, setTrendMetricState] = useState<string>(initialSelection?.trendMetric ?? 'largestContentfulPaintMs');
  const [trendChartTypeState, setTrendChartTypeState] = useState<TrendChartType>((initialSelection?.trendChartType as TrendChartType) ?? 'line');
  const [trendBasisState, setTrendBasisState] = useState<TrendBasis>('iteration');
  const [diagnosticHeatMetric, setDiagnosticHeatMetric] = useState('failedAudits');
  const [trendSelections, setTrendSelections] = useState<TrendSelections>({});
  const [expandedRunFolders, setExpandedRunFolders] = useState<string[]>([]);
  const [auditCell, setAuditCell] = useState(null);
  const [auditCellData, setAuditCellData] = useState(null);
  const [auditCellLoading, setAuditCellLoading] = useState(false);
  const [auditCellError, setAuditCellError] = useState('');
  const lastDragSelectAtRef = useRef(0);
  const lastSelectionChangeAtRef = useRef(0);
  // Iteration filtering only makes practical sense on the "run" basis (iteration is the x-axis
  // otherwise); empty selection means "all iterations".
  const [selectedIterationsState, setSelectedIterationsState] = useState<number[]>([]);

  const trendMetric = controlledTrendMetric ?? trendMetricState;
  const trendChartType = controlledTrendChartType ?? trendChartTypeState;
  const trendBasis = controlledTrendBasis ?? trendBasisState;
  const selectedIterations = controlledSelectedIterations ?? selectedIterationsState;

  function setTrendMetric(nextMetric: string) {
    if (controlledTrendMetric === undefined) {
      setTrendMetricState(nextMetric);
    }
    onTrendMetricChange?.(nextMetric);
  }

  function setTrendChartType(nextChartType: TrendChartType) {
    if (controlledTrendChartType === undefined) {
      setTrendChartTypeState(nextChartType);
    }
    onTrendChartTypeChange?.(nextChartType);
  }

  function setTrendBasis(nextBasis: TrendBasis) {
    if (controlledTrendBasis === undefined) {
      setTrendBasisState(nextBasis);
    }
    onTrendBasisChange?.(nextBasis);
  }

  function updateSelectedIterations(next: number[] | ((current: number[]) => number[])) {
    const resolved = typeof next === 'function' ? next(selectedIterations) : next;
    if (controlledSelectedIterations === undefined) {
      setSelectedIterationsState(resolved);
    }
    onSelectedIterationsChange?.(resolved);
  }

  // ── filtered rows ───────────────────────────────────────────────────────────
  const filteredRows = useMemo(() => {
    return dataset.rows;
  }, [dataset.rows]);

  const availableIterations = useMemo(() => [...new Set<number>(filteredRows.map((row) => Number(row.iteration)))].filter(Number.isFinite).sort((a, b) => a - b), [filteredRows]);

  // ── framework-separated trend plots ─────────────────────────────────────────
  const trendScopedRows = useMemo(() => filteredRows.filter((row) =>
    !selectedIterations.length || selectedIterations.includes(Number(row.iteration))
  ), [filteredRows, selectedIterations]);

  useEffect(() => {
    if (!availableIterations.length) return;
    updateSelectedIterations((current) => current.filter((iteration) => availableIterations.includes(iteration)));
  }, [availableIterations]);

  useEffect(() => {
    if (trendBasis !== 'run') {
      updateSelectedIterations([]);
    }
  }, [trendBasis]);

  const trendPanels = useMemo(() => {
    const meta = METRIC_META[trendMetric] ?? { label: trendMetric, axisLabel: trendMetric };
    const frameworks = aggregateBy(trendScopedRows, frameworkKey);

    return [...frameworks.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([framework, frameworkRows]) => {
      const versionBaseColor = frameworkVersionColor(framework);
      const platformGroups = aggregateBy(frameworkRows, (row) => row.preset);
      const series = [...platformGroups.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([platform, rows], index) => ({
        platform,
        color: shiftHexColor(versionBaseColor, index * 0.1 - 0.08),
        rows: [...rows].sort((a, b) => trendBasis === 'run'
          ? displayRunFolder(a.runFolder).localeCompare(displayRunFolder(b.runFolder)) || a.iteration - b.iteration
          : a.iteration - b.iteration),
      }));

      if (trendChartType === 'heatmap') {
        const xValues = trendBasis === 'run'
          ? Array.from(new Set<string>(frameworkRows.map((row) => displayRunFolder(row.runFolder)))).sort()
          : Array.from(new Set<number>(frameworkRows.map((row) => Number(row.iteration)))).sort((a, b) => a - b);
        const z = series.map((item) => xValues.map((xValue) => {
          const matched = item.rows.filter((row) => trendBasis === 'run' ? displayRunFolder(row.runFolder) === xValue : row.iteration === xValue);
          const values = matched.map((row) => Number(row[trendMetric])).filter(Number.isFinite);
          return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : Number.NaN;
        }));
        const customdata = series.map((item) => xValues.map((xValue) =>
          item.rows
            .filter((row) => trendBasis === 'run' ? displayRunFolder(row.runFolder) === xValue : row.iteration === xValue)
            .map((row) => `row:${rowKey(row)}`)
        ));
        return {
          framework,
          data: [{ type: 'heatmap', x: xValues, y: series.map((item) => item.platform), z, customdata, colorscale: 'Viridis', hovertemplate: `${trendBasis === 'run' ? 'Run' : 'Iter'}: %{x}<br>Platform: %{y}<br>${meta.label}: %{z:.3f}<extra></extra>` }],
        };
      }

      const data = series.map((item) => {
        const validRows = item.rows.filter((row) => Number.isFinite(Number(row[trendMetric])));
        const x = validRows.map((row) => trendBasis === 'run' ? displayRunFolder(row.runFolder) : row.iteration);
        const y = validRows.map((row) => Number(row[trendMetric]));
        const hovertext = validRows.map((row) => makeSeriesHover(row, meta.label, formatMetric(trendMetric, Number(row[trendMetric]))));
        const customdata = validRows.map((row) => `row:${rowKey(row)}`);
        const base = { name: item.platform, hovertext, customdata, hovertemplate: '%{hovertext}<extra></extra>', hoverlabel: { bgcolor: 'rgba(8,15,30,0.97)', bordercolor: item.color, font: { color: '#e2ecfd' } } };
        if (trendChartType === 'box' || trendChartType === 'violin') {
          const categoryFor = (row) => trendBasis === 'run' ? displayRunFolder(row.runFolder) : String(row.iteration);
          const grouped = aggregateBy(validRows, categoryFor);
          const statsByCategory = new Map([...grouped.entries()].map(([category, rows]) => {
            const values = rows.map((row) => Number(row[trendMetric])).filter(Number.isFinite);
            const s = summarize(trendMetric, values);
            return [category, s];
          }));
          const statsCustomData = validRows.map((row) => {
            const category = categoryFor(row);
            const s = statsByCategory.get(category);
            return [`row:${rowKey(row)}`, s?.mean ?? Number.NaN, s?.median ?? Number.NaN, s?.max ?? Number.NaN, s?.min ?? Number.NaN];
          });
          const statsHover = `%{hovertext}<br>Mean: %{customdata[1]:.3f}<br>Median: %{customdata[2]:.3f}<br>Max: %{customdata[3]:.3f}<br>Min: %{customdata[4]:.3f}<extra></extra>`;

          if (trendChartType === 'box') {
            return {
              type: 'box',
              x,
              y,
              ...base,
              customdata: statsCustomData,
              hovertemplate: statsHover,
              marker: { size: 5, color: item.color, opacity: 0.8 },
              boxpoints: 'all',
              jitter: 0.2,
              boxmean: true,
            };
          }

          return {
            type: 'violin',
            x,
            y,
            ...base,
            customdata: statsCustomData,
            hovertemplate: statsHover,
            points: 'all',
            jitter: 0.2,
            marker: { size: 5, color: item.color, opacity: 0.8 },
            line: { color: item.color },
            meanline: { visible: true },
          };
        }
        if (trendChartType === 'histogram') return { type: 'histogram', x: y, ...base, marker: { color: item.color, opacity: 0.75 } };
        if (trendChartType === 'bar') return { type: 'bar', x, y, ...base, marker: { color: item.color, opacity: 0.85 } };
        if (trendChartType === 'scatter') return { type: 'scatter', mode: 'markers', x, y, ...base, marker: { size: 8, color: item.color, opacity: 0.85 } };
        return { type: 'scatter', mode: 'lines+markers', x, y, ...base, marker: { size: 7, color: item.color }, line: { color: item.color, width: 2 } };
      });
      return { framework, data };
    });
  }, [trendBasis, trendChartType, trendMetric, trendScopedRows]);

  const displayedTrendPanels = useMemo(() => {
    if (!trendPanels.length) return [];
    const combinedMeta = METRIC_META[trendMetric] ?? { label: trendMetric, axisLabel: trendMetric };

    if (trendChartType === 'heatmap') {
      const meta = METRIC_META[trendMetric] ?? { label: trendMetric, axisLabel: trendMetric };
      const grouped = aggregateBy(trendScopedRows, (row) => `${frameworkKey(row)} / ${row.preset}`);
      const yValues = [...grouped.keys()].sort((a, b) => a.localeCompare(b));
      const xValues = trendBasis === 'run'
        ? Array.from(new Set<string>(trendScopedRows.map((row) => displayRunFolder(row.runFolder)))).sort()
        : Array.from(new Set<number>(trendScopedRows.map((row) => Number(row.iteration)))).sort((a, b) => a - b);

      const z = yValues.map((label) => xValues.map((xValue) => {
        const rows = (grouped.get(label) ?? []).filter((row) =>
          trendBasis === 'run' ? displayRunFolder(row.runFolder) === xValue : row.iteration === xValue
        );
        const values = rows.map((row) => Number(row[trendMetric])).filter(Number.isFinite);
        return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : Number.NaN;
      }));

      const customdata = yValues.map((label) => xValues.map((xValue) =>
        (grouped.get(label) ?? [])
          .filter((row) => trendBasis === 'run' ? displayRunFolder(row.runFolder) === xValue : row.iteration === xValue)
          .map((row) => `row:${rowKey(row)}`)
      ));

      return [{
        framework: 'all',
        data: [{
          type: 'heatmap',
          x: xValues,
          y: yValues,
          z,
          customdata,
          colorscale: 'Viridis',
          hovertemplate: `${trendBasis === 'run' ? 'Run' : 'Iter'}: %{x}<br>Framework / Platform: %{y}<br>${meta.label}: %{z:.3f}<extra></extra>`,
        }],
      }];
    }

    const combinedData = [...aggregateBy(trendScopedRows, frameworkKey).entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([framework, frameworkRows]) => {
          const color = frameworkVersionColor(framework);

          if (trendChartType === 'histogram') {
            const validRows = frameworkRows.filter((row) => Number.isFinite(Number(row[trendMetric])));
            return {
              type: 'histogram',
              name: framework,
              x: validRows.map((row) => Number(row[trendMetric])),
              marker: { color, opacity: 0.75 },
              customdata: validRows.map((row) => `row:${rowKey(row)}`),
              hovertemplate: `${framework}<br>${combinedMeta.label}: %{x:.3f}<extra></extra>`,
            };
          }

          const groupedByBasis = aggregateBy(
            frameworkRows.filter((row) => Number.isFinite(Number(row[trendMetric]))),
            (row) => trendBasis === 'run' ? displayRunFolder(row.runFolder) : String(row.iteration)
          );

          const basisValues = [...groupedByBasis.keys()].sort((a, b) =>
            trendBasis === 'run' ? a.localeCompare(b) : Number(a) - Number(b)
          );

          const x = basisValues.map((value) => trendBasis === 'run' ? `${framework} · ${value}` : Number(value));
          const y = basisValues.map((value) => {
            const rows = groupedByBasis.get(value) ?? [];
            const values = rows.map((row) => Number(row[trendMetric])).filter(Number.isFinite);
            return values.length ? values.reduce((sum, metricValue) => sum + metricValue, 0) / values.length : Number.NaN;
          });
          const customdata = basisValues.map((value) =>
            (groupedByBasis.get(value) ?? []).map((row) => `row:${rowKey(row)}`)
          );

          if (trendChartType === 'box') {
            const boxRows = frameworkRows.filter((row) => Number.isFinite(Number(row[trendMetric])));
            const groupedByX = aggregateBy(boxRows, (row) => trendBasis === 'run'
              ? `${framework} · ${displayRunFolder(row.runFolder)}`
              : String(row.iteration));
            const statsByX = new Map([...groupedByX.entries()].map(([category, rows]) => {
              const values = rows.map((row) => Number(row[trendMetric])).filter(Number.isFinite);
              const s = summarize(trendMetric, values);
              return [category, s];
            }));
            const boxCustomData = boxRows.map((row) => {
              const category = trendBasis === 'run'
                ? `${framework} · ${displayRunFolder(row.runFolder)}`
                : String(row.iteration);
              const s = statsByX.get(category);
              return [`row:${rowKey(row)}`, s?.mean ?? Number.NaN, s?.median ?? Number.NaN, s?.max ?? Number.NaN, s?.min ?? Number.NaN];
            });
            return {
              type: 'box',
              name: framework,
              x: boxRows.map((row) => trendBasis === 'run'
                ? `${framework} · ${displayRunFolder(row.runFolder)}`
                : row.iteration),
              y: boxRows.map((row) => Number(row[trendMetric])),
              marker: { size: 5, color, opacity: 0.8 },
              boxpoints: 'all',
              jitter: 0.2,
              customdata: boxCustomData,
              hovertemplate: `%{x}<br>${combinedMeta.label}: %{y:.3f}<br>Mean: %{customdata[1]:.3f}<br>Median: %{customdata[2]:.3f}<br>Max: %{customdata[3]:.3f}<br>Min: %{customdata[4]:.3f}<extra>${framework}</extra>`,
              boxmean: true,
            };
          }

          if (trendChartType === 'violin') {
            const violinRows = frameworkRows.filter((row) => Number.isFinite(Number(row[trendMetric])));
            const groupedByX = aggregateBy(violinRows, (row) => trendBasis === 'run'
              ? `${framework} · ${displayRunFolder(row.runFolder)}`
              : String(row.iteration));
            const statsByX = new Map([...groupedByX.entries()].map(([category, rows]) => {
              const values = rows.map((row) => Number(row[trendMetric])).filter(Number.isFinite);
              const s = summarize(trendMetric, values);
              return [category, s];
            }));
            const violinCustomData = violinRows.map((row) => {
              const category = trendBasis === 'run'
                ? `${framework} · ${displayRunFolder(row.runFolder)}`
                : String(row.iteration);
              const s = statsByX.get(category);
              return [`row:${rowKey(row)}`, s?.mean ?? Number.NaN, s?.median ?? Number.NaN, s?.max ?? Number.NaN, s?.min ?? Number.NaN];
            });
            return {
              type: 'violin',
              name: framework,
              x: violinRows.map((row) => trendBasis === 'run'
                ? `${framework} · ${displayRunFolder(row.runFolder)}`
                : row.iteration),
              y: violinRows.map((row) => Number(row[trendMetric])),
              points: 'all',
              jitter: 0.2,
              marker: { size: 5, color, opacity: 0.8 },
              line: { color },
              customdata: violinCustomData,
              hovertemplate: `%{x}<br>${combinedMeta.label}: %{y:.3f}<br>Mean: %{customdata[1]:.3f}<br>Median: %{customdata[2]:.3f}<br>Max: %{customdata[3]:.3f}<br>Min: %{customdata[4]:.3f}<extra>${framework}</extra>`,
              meanline: { visible: true },
            };
          }

          if (trendChartType === 'bar') {
            return {
              type: 'bar',
              name: framework,
              x,
              y,
              marker: { color, opacity: 0.85 },
              customdata,
              hovertemplate: `%{x}<br>${combinedMeta.label}: %{y:.3f}<extra>${framework}</extra>`,
            };
          }

          if (trendChartType === 'scatter') {
            return {
              type: 'scatter',
              mode: 'markers',
              name: framework,
              x,
              y,
              marker: { size: 8, color, opacity: 0.85 },
              customdata,
              hovertemplate: `%{x}<br>${combinedMeta.label}: %{y:.3f}<extra>${framework}</extra>`,
            };
          }

          return {
            type: 'scatter',
            mode: 'lines+markers',
            name: framework,
            x,
            y,
            marker: { size: 7, color },
            line: { color, width: 2 },
            customdata,
            hovertemplate: `%{x}<br>${combinedMeta.label}: %{y:.3f}<extra>${framework}</extra>`,
          };
        });

    return [{ framework: 'all', data: combinedData }];
  }, [trendBasis, trendChartType, trendMetric, trendPanels, trendScopedRows]);

  useEffect(() => {
    setTrendSelections({});
  }, [trendBasis, trendChartType, trendMetric, selectedIterations]);

  const activeTrendSelections = useMemo(() => trendSelections, [trendSelections]);

  const selectedTrendKeys = useMemo(
    () => uniqueValues(Object.values(activeTrendSelections).flatMap((tokens) => tokens)),
    [activeTrendSelections]
  );

  function setTrendSelection(framework, event, source = 'drag') {
    const tokens = tokensFromPlotEvent(event);
    if (!tokens.length) {
      clearTrendSelection(framework);
      return;
    }
    const now = Date.now();
    if (source === 'drag') lastDragSelectAtRef.current = now;
    lastSelectionChangeAtRef.current = now;
    setTrendSelections((current) => {
      const currentTokens = current[framework] ?? [];
      const next = { ...current };
      const normalized = uniqueValues(tokens);
      const isSame = normalized.length === currentTokens.length && normalized.every((token) => currentTokens.includes(token));
      if (isSame) delete next[framework];
      else next[framework] = normalized;
      return next;
    });
  }

  function clickTrendSelection(framework, event) {
    if (Date.now() - lastDragSelectAtRef.current < 250) return;
    setTrendSelection(framework, event, 'click');
  }

  function clearTrendSelection(framework) {
    lastSelectionChangeAtRef.current = Date.now();
    setTrendSelections((current) => {
      const next = { ...current };
      delete next[framework];
      return next;
    });
  }

  function handleTrendDeselect(framework) {
    if (Date.now() - lastSelectionChangeAtRef.current < 180) return;
    clearTrendSelection(framework);
  }

  async function openAuditCell(event) {
    const point = event?.points?.[0];
    if (typeof point?.x !== 'string' || typeof point?.y !== 'string' || !Number.isFinite(Number(point?.z))) return;
    const separator = ' / ';
    const separatorIndex = point.x.lastIndexOf(separator);
    if (separatorIndex < 0) return;
    const cell = {
      framework: point.x.slice(0, separatorIndex),
      preset: point.x.slice(separatorIndex + separator.length),
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

  // ── diagnostic heatmap ───────────────────────────────────────────────────────
  const diagnosticHeatmap = useMemo(() => {
    const allRows = dataset.rows;
    if (!allRows.length) return { x: [], y: [], z: [], hover: [] };
    const rpGroups = aggregateBy(allRows, (r) => `${r.route}|${r.preset}`);
    const bests = new Map();
    for (const [gk, rows] of rpGroups.entries()) {
      bests.set(gk, {
        minFcp: Math.min(...rows.map((r) => Number(r.firstContentfulPaintMs)).filter(Number.isFinite)),
        minLcp: Math.min(...rows.map((r) => Number(r.largestContentfulPaintMs)).filter(Number.isFinite)),
        maxPerf: Math.max(...rows.map((r) => Number(r.performanceScore)).filter(Number.isFinite)),
      });
    }
    const groupByCell = aggregateBy(allRows, (r) => `${frameworkPresetKey(r)}|${r.route}`);
    const x = Array.from(new Set<string>(allRows.map((r) => `${frameworkKey(r)} / ${r.preset}`))).sort();
    const y = Array.from(new Set<string>(allRows.map((r) => r.route))).sort();
    const mean = (vals) => vals.length ? vals.reduce((a, v) => a + v, 0) / vals.length : Number.NaN;

    const z = y.map((route) => x.map((fp) => {
      const [fw, preset] = fp.split(' / ');
      const key = `${fw}|${preset}|${route}`;
      const rows = groupByCell.get(key) ?? [];
      if (!rows.length) return Number.NaN;
      const vals = rows.map((r) => {
        if (diagnosticHeatMetric === 'fcpImprovementMs') { const b = bests.get(`${r.route}|${r.preset}`); return b ? Number(r.firstContentfulPaintMs) - b.minFcp : Number.NaN; }
        if (diagnosticHeatMetric === 'lcpImprovementMs') { const b = bests.get(`${r.route}|${r.preset}`); return b ? Number(r.largestContentfulPaintMs) - b.minLcp : Number.NaN; }
        if (diagnosticHeatMetric === 'performanceGainPotential') { const b = bests.get(`${r.route}|${r.preset}`); return b ? b.maxPerf - Number(r.performanceScore) : Number.NaN; }
        return Number(r[diagnosticHeatMetric]);
      }).filter(Number.isFinite);
      return vals.length ? mean(vals) : Number.NaN;
    }));

    const hover = y.map((route) => x.map((fp) => {
      const [fw, preset] = fp.split(' / ');
      const key = `${fw}|${preset}|${route}`;
      const rows = groupByCell.get(key) ?? [];
      if (!rows.length) return 'No data';
      return [`<b>${fp}</b>`, `Route: ${route}`, `Samples: ${rows.length}`,
        `Avg failed: ${mean(rows.map((r) => Number(r.failedAudits)).filter(Number.isFinite)).toFixed(2)}`,
        `Avg FCP: ${mean(rows.map((r) => Number(r.firstContentfulPaintMs)).filter(Number.isFinite)).toFixed(0)} ms`,
        `Avg Perf: ${(mean(rows.map((r) => Number(r.performanceScore)).filter(Number.isFinite)) * 100).toFixed(1)}%`,
      ].join('<br>');
    }));

    return { x, y, z, hover };
  }, [dataset.rows, diagnosticHeatMetric]);

  // ── selected rows from trend click ──────────────────────────────────────────
  const selectedRowsTrend = useMemo(() => {
    if (!selectedTrendKeys.length) return trendScopedRows;
    const rowTokens = new Set(selectedTrendKeys.filter((t) => t.startsWith('row:')).map((t) => t.slice(4)));
    const grpTokens = new Set(selectedTrendKeys.filter((t) => t.startsWith('grp:')).map((t) => t.slice(4)));
    if (rowTokens.size) { const matches = trendScopedRows.filter((row) => rowTokens.has(rowKey(row))); return matches.length ? matches : trendScopedRows; }
    if (grpTokens.size) { const matches = trendScopedRows.filter((row) => grpTokens.has(frameworkPresetKey(row))); return matches.length ? matches : trendScopedRows; }
    const iterationTokens = new Set(selectedTrendKeys.map(Number).filter(Number.isFinite));
    const runTokens = new Set(selectedTrendKeys.filter((token) => Number.isNaN(Number(token))));
    const matches = trendScopedRows.filter((row) => iterationTokens.has(row.iteration) || runTokens.has(displayRunFolder(row.runFolder)));
    return matches.length ? matches : trendScopedRows;
  }, [selectedTrendKeys, trendScopedRows]);

  // ── stat summary rows ────────────────────────────────────────────────────────
  const platformSummaryRows = useMemo(() => {
    const metrics = PRIMARY_METRICS;
    const grouped = aggregateBy(dataset.rows, (r) => `${frameworkKey(r)}|${r.route}|${r.preset}`);
    const summaries = [];
    for (const [key, rows] of grouped.entries()) {
      const [framework, route, preset] = key.split('|');
      for (const metric of metrics) {
        const values = rows.map((r) => Number(r[metric])).filter(Number.isFinite);
        if (!values.length) continue;
        const s = summarize(metric, values);
        summaries.push({ framework, route, preset, metric: METRIC_META[metric]?.label ?? metric, n: s.n, mean: formatMetric(metric, s.mean), median: formatMetric(metric, s.median), stdDev: s.stdDev.toFixed(2), iqr: formatMetric(metric, s.iqr), p90: formatMetric(metric, s.p90), p95: formatMetric(metric, s.p95) });
      }
    }
    return summaries.sort((a, b) => a.framework.localeCompare(b.framework) || a.route.localeCompare(b.route) || a.preset.localeCompare(b.preset) || a.metric.localeCompare(b.metric));
  }, [dataset.rows]);

  // ── table row shapes ─────────────────────────────────────────────────────────
  const trendTableRows = useMemo(() => selectedRowsTrend.map((r) => ({
    runFolderRaw: r.runFolder,
    run: displayRunFolder(r.runFolder),
    timestamp: formatDateTime(r.timestamp),
    framework: frameworkKey(r),
    preset: r.preset,
    route: r.route,
    iteration: r.iteration,
    metricValue: formatMetric(trendMetric, Number(r[trendMetric])),
    performance: formatMetric('performanceScore', r.performanceScore),
    fcp: formatMetric('firstContentfulPaintMs', r.firstContentfulPaintMs),
    lcp: formatMetric('largestContentfulPaintMs', r.largestContentfulPaintMs),
    tbt: formatMetric('totalBlockingTimeMs', r.totalBlockingTimeMs),
    cls: formatMetric('cumulativeLayoutShift', r.cumulativeLayoutShift),
    speedIndex: formatMetric('speedIndexMs', r.speedIndexMs),
    accessibility: formatMetric('categoryAccessibility', r.categoryAccessibility),
    bestPractices: formatMetric('categoryBestPractices', r.categoryBestPractices),
    seo: formatMetric('categorySeo', r.categorySeo),
    failedAudits: r.failedAudits,
    insightAudits: r.insightAuditCount,
    diagnosticItems: r.diagnosticsItemCount,
    jsonPath: r.jsonReportRelativePath,
    htmlPath: r.htmlReportRelativePath,
    csvPath: r.csvReportRelativePath,
  })), [selectedRowsTrend, trendMetric]);

  const trendRunAccordionRows = useMemo(() => {
    const runMetaByFolder = new Map<string, any>((dataset.runs ?? []).map((run: any) => [run.runFolder, run]));
    const grouped = aggregateBy(trendTableRows, (row) => row.runFolderRaw);
    return [...grouped.entries()]
      .sort(([left], [right]) => right.localeCompare(left))
      .map(([runFolder, runRows]) => {
        const runMeta = runMetaByFolder.get(runFolder) ?? null;
        const iterationValues = uniqueValues<number>(runRows.map((row) => Number(row.iteration))).sort((a, b) => a - b);
        const frameworks = uniqueValues<string>(runRows.map((row) => String(row.framework))).sort((a, b) => a.localeCompare(b));
        const presets = uniqueValues<string>(runRows.map((row) => String(row.preset))).sort((a, b) => a.localeCompare(b));
        const routes = uniqueValues<string>(runRows.map((row) => String(row.route))).sort((a, b) => a.localeCompare(b));
        const sortedRows = [...runRows].sort((a, b) => Number(a.iteration) - Number(b.iteration)
          || String(a.framework).localeCompare(String(b.framework))
          || String(a.preset).localeCompare(String(b.preset))
          || String(a.route).localeCompare(String(b.route))
        );

        return {
          runFolder,
          runLabel: displayRunFolder(runFolder),
          selectedRowCount: runRows.length,
          iterations: iterationValues,
          frameworks,
          presets,
          routes,
          meta: runMeta ? {
            rowCount: runMeta.rowCount,
            frameworkCount: runMeta.frameworks.length,
            presets: runMeta.presets,
            routeCount: runMeta.routes.length,
            iterationRange: `${runMeta.iterationMin ?? 'n/a'} - ${runMeta.iterationMax ?? 'n/a'}`,
            firstTimestamp: formatDateTime(runMeta.firstTimestamp),
            lastTimestamp: formatDateTime(runMeta.lastTimestamp),
          } : null,
          rows: sortedRows,
        };
      });
  }, [dataset.runs, trendTableRows]);

  useEffect(() => {
    if (!trendRunAccordionRows.length) {
      setExpandedRunFolders([]);
      return;
    }
    setExpandedRunFolders((current) => {
      const available = new Set(trendRunAccordionRows.map((row) => row.runFolder));
      const stillOpen = current.filter((runFolder) => available.has(runFolder));
      if (stillOpen.length) return stillOpen;
      return [trendRunAccordionRows[0].runFolder];
    });
  }, [trendRunAccordionRows]);

  function toggleRunFolder(runFolder: string) {
    setExpandedRunFolders((current) => (current.includes(runFolder)
      ? current.filter((entry) => entry !== runFolder)
      : [...current, runFolder]));
  }

  // ── column definitions ───────────────────────────────────────────────────────

  const statsColumns = useMemo(() => [
    colDef('framework', 'Framework'),
    colDef('route', 'Route'),
    colDef('preset', 'Platform'),
    colDef('metric', 'Metric'),
    colDef('n', 'n'),
    colDef('mean', 'Mean'),
    colDef('median', 'Median'),
    colDef('stdDev', 'Std Dev'),
    colDef('iqr', 'IQR'),
    colDef('p90', 'p90'),
    colDef('p95', 'p95'),
  ], []);

  const trendDetailColumns = useMemo(() => [
    colDef('iteration', 'Iteration'),
    colDef('timestamp', 'Timestamp'),
    colDef('framework', 'Framework'),
    colDef('preset', 'Platform'),
    colDef('route', 'Route'),
    colDef('metricValue', METRIC_META[trendMetric]?.label ?? trendMetric),
    colDef('performance', 'Perf'),
    colDef('fcp', 'FCP'),
    colDef('lcp', 'LCP'),
    colDef('tbt', 'TBT'),
    colDef('cls', 'CLS'),
    colDef('speedIndex', 'Speed Index'),
    colDef('failedAudits', 'Failed'),
    {
      accessorKey: 'action', header: 'Actions', enableSorting: false, enableHiding: false,
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1.5">
          {row.original.jsonPath && <a href={`${artifactHref(row.original.jsonPath)}`} target="_blank" rel="noreferrer" className="rounded border border-white/10 bg-white/4 px-2 py-0.5 text-[11px] text-muted-foreground hover:text-foreground">JSON</a>}
          {row.original.htmlPath && <a href={`${artifactHref(row.original.htmlPath)}`} target="_blank" rel="noreferrer" className="rounded border border-white/10 bg-white/4 px-2 py-0.5 text-[11px] text-muted-foreground hover:text-foreground">HTML</a>}
          {row.original.csvPath && <a href={`${apiBaseUrl()}/api/lighthouse/artifact?file=${encodeURIComponent(row.original.csvPath)}&disposition=attachment`} target="_blank" rel="noreferrer" className="rounded border border-white/10 bg-white/4 px-2 py-0.5 text-[11px] text-muted-foreground hover:text-foreground">CSV</a>}
        </div>
      ),
    },
  ], [trendMetric]);


  const selectedIterCount = new Set(filteredRows.map((r) => r.iteration)).size;
  const trendMeta = METRIC_META[trendMetric] ?? { label: trendMetric, axisLabel: trendMetric };
  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-w-0 w-full space-y-5">

      {showKpis && (
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard title="Runs" value={String(new Set(filteredRows.map((r) => r.runFolder)).size)} detail="Date folders included" />
          <KpiCard title="Frameworks" value={String(new Set(filteredRows.map((r) => frameworkKey(r))).size)} detail="Distinct framework variants" />
          <KpiCard title="Platforms" value={String(new Set(filteredRows.map((r) => r.preset)).size)} detail="Mobile / desktop presets" />
          <KpiCard title="Routes" value={String(new Set(filteredRows.map((r) => r.route)).size)} detail="Distinct tested routes" />
        </section>
      )}

      {showHeader && (
        <section id="overview" className="rounded-xl border border-white/8 bg-card p-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.28em] text-cyan-300/60">Scientific Evaluation</p>
              <h1 className="mt-1 text-xl font-semibold text-foreground">Lighthouse Results Explorer</h1>
              <p className="mt-1.5 max-w-2xl text-xs text-muted-foreground leading-relaxed">
                Detailed and summarized analysis from summary CSV + JSON report internals across all dated runs.
              </p>
            </div>
            <div className="rounded-lg border border-cyan-400/15 bg-cyan-400/5 px-4 py-3 text-xs text-cyan-100">
              <p className="font-semibold">Selected rows</p>
              <p className="mt-0.5 tabular-nums">{filteredRows.length} / {dataset.rows.length}</p>
              <p className="text-cyan-200/60">{selectedIterCount} iteration values</p>
            </div>
          </div>
        </section>
      )}

      {showStatsTable && (
        <section id="platforms" className="rounded-xl border border-white/8 bg-card p-4">
          <p className="text-[10px] uppercase tracking-[0.22em] text-cyan-300/60 mb-0.5">All data</p>
          <DataTable
            title="Platform Summary Statistics"
            columns={statsColumns}
            data={platformSummaryRows}
            fileName="platform-statistics-static.csv"
            searchPlaceholder="Search stats..."
            defaultPageSize={10}
            compact
          />
        </section>
      )}

      {/* ── Trend / distribution chart ────────────────────────────────────── */}
      <section id="iterations" className="rounded-xl border border-white/8 bg-card p-4">
        {showTopFiltersCard && (
        <div className="sticky top-0 z-20 mb-4 rounded-xl border border-white/8 bg-card/95 p-3 backdrop-blur-md">
          <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_360px]">
            <GlobalFiltersPanel filters={filters} className="w-full rounded-lg border border-white/8 bg-background/20 p-3" />
            <section className="rounded-lg border border-white/8 bg-background/20 p-3">
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-muted-foreground">Basis</label>
                  <Select value={trendBasis} onValueChange={setTrendBasis}>
                    <SelectTrigger className="w-full border-white/10 bg-card text-xs text-foreground focus:ring-cyan-400/50"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-popover border-white/10 text-xs">
                      <SelectItem value="iteration" className="text-xs focus:bg-white/8">Iteration-based</SelectItem>
                      <SelectItem value="run" className="text-xs focus:bg-white/8">Run-based</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {trendBasis === 'run' && (
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-medium text-muted-foreground">Iterations</label>
                    <MultiSelectCombobox
                      placeholder="All iterations"
                      searchPlaceholder="Search iterations..."
                      options={availableIterations.map((iteration) => ({ value: String(iteration), label: `Iteration ${iteration}` }))}
                      selected={selectedIterations.map(String)}
                      onChange={(next) => updateSelectedIterations(next.map(Number))}
                    />
                    <p className="text-[10px] text-muted-foreground">Pick which iteration(s) to compare across runs.</p>
                  </div>
                )}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-muted-foreground">Metric</label>
                  <Select value={trendMetric} onValueChange={setTrendMetric}>
                    <SelectTrigger className="w-full border-white/10 bg-card text-xs text-foreground focus:ring-cyan-400/50"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-popover border-white/10 text-xs max-h-60">
                      {PRIMARY_METRICS.map((m) => (
                        <SelectItem key={m} value={m} className="text-xs focus:bg-white/8">{METRIC_META[m]?.label ?? m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-muted-foreground">Chart type</label>
                  <Select value={trendChartType} onValueChange={(value) => setTrendChartType(value as TrendChartType)}>
                    <SelectTrigger className="w-full border-white/10 bg-card text-xs text-foreground focus:ring-cyan-400/50"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-popover border-white/10 text-xs">
                      {CHART_TYPES.map((t) => (
                        <SelectItem key={t} value={t} className="text-xs focus:bg-white/8 capitalize">{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </section>
          </div>
        </div>
        )}

        {displayedTrendPanels.length ? (
          <div className="flex flex-col gap-6 xl:h-140">
            <div className="grid flex-1 gap-4 xl:grid-cols-1">
            {displayedTrendPanels.map((panel) => (
              <div key={panel.framework} className={cn('h-full', panel.framework === 'all' ? 'xl:col-span-2' : '')}>
                <PlotCard
                eyebrow={panel.framework === 'all' ? 'All Frameworks' : 'Framework'}
                title={panel.framework === 'all' ? 'All frameworks' : panel.framework}
                exportName={`iteration-${panel.framework === 'all' ? 'all-frameworks' : panel.framework}-${trendChartType}`}
                data={panel.data}
                layout={{
                  uirevision: `trend-${panel.framework}-${trendBasis}-${trendChartType}-${trendMetric}`,
                  xaxis: {
                    title: panel.framework === 'all'
                      ? (trendChartType === 'histogram' ? trendMeta.axisLabel : (trendBasis === 'run' ? 'Framework · Run folder' : 'Iteration index'))
                      : (trendChartType === 'histogram' ? trendMeta.axisLabel : (trendBasis === 'run' ? 'Run folder' : 'Iteration index')),
                    tickangle: trendBasis === 'run' ? -25 : 0,
                  },
                  yaxis: { title: trendChartType === 'histogram' ? 'Count' : trendMeta.axisLabel },
                  dragmode: 'select', clickmode: 'event+select',
                  legend: { title: { text: panel.framework === 'all' ? 'Framework' : 'Platform' } },
                  margin: { t: 12, r: 16, l: 60, b: 60 },
                }}
                height="420px"
                fillHeight
                className="h-full bg-card/40"
                onSelected={(event) => setTrendSelection(panel.framework, event)}
                onClick={(event) => clickTrendSelection(panel.framework, event)}
                onDeselect={() => handleTrendDeselect(panel.framework)}
                onDoubleClick={() => clearTrendSelection(panel.framework)}
                onSelectionStateChange={(hasSelection) => {
                  if (!hasSelection) clearTrendSelection(panel.framework);
                }}
              />
              </div>
            ))}
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-white/10 px-4 py-10 text-center text-sm text-muted-foreground">
            No trend data matches the current dashboard filters.
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/8 bg-background/30 px-3 py-2">
          <p className="text-xs text-muted-foreground">
            {selectedTrendKeys.length
              ? `${selectedRowsTrend.length} rows selected across ${Object.keys(activeTrendSelections).length} graph${Object.keys(activeTrendSelections).length === 1 ? '' : 's'}`
              : `No graph selection · showing all ${trendScopedRows.length} rows`}
          </p>
          {selectedTrendKeys.length > 0 && (
            <Button variant="outline" size="sm" className="h-7 border-white/10 bg-transparent text-xs" onClick={() => setTrendSelections({})}>
              Clear all selections
            </Button>
          )}
        </div>
          <div className="mt-3 space-y-2">
            <section className="overflow-hidden rounded-lg border border-white/10 bg-background/20">
              <div className="grid grid-cols-[24px_1.2fr_100px_110px_100px_1.2fr_100px] items-center gap-2 border-b border-white/10 bg-white/5 px-3 py-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                <span />
                <span>Run</span>
                <span>Selected rows</span>
                <span>Iterations</span>
                <span>Frameworks</span>
                <span>Platforms</span>
                <span>Rows in run</span>
              </div>
              <div className="divide-y divide-white/8">
                {trendRunAccordionRows.map((runGroup) => {
                  const isExpanded = expandedRunFolders.includes(runGroup.runFolder);
                  return (
                    <div key={runGroup.runFolder}>
                      <button
                        type="button"
                        onClick={() => toggleRunFolder(runGroup.runFolder)}
                        aria-expanded={isExpanded}
                        className="grid w-full grid-cols-[24px_1.2fr_100px_110px_100px_1.2fr_100px] items-center gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-white/5"
                      >
                        <ChevronRight className={cn('h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform', isExpanded && 'rotate-90')} />
                        <span className="truncate text-foreground" title={runGroup.runLabel}>{runGroup.runLabel}</span>
                        <span className="tabular-nums text-foreground">{runGroup.selectedRowCount}</span>
                        <span className="tabular-nums text-muted-foreground">{runGroup.iterations.length ? `${runGroup.iterations[0]}-${runGroup.iterations[runGroup.iterations.length - 1]}` : 'n/a'}</span>
                        <span className="tabular-nums text-muted-foreground">{runGroup.meta?.frameworkCount ?? runGroup.frameworks.length}</span>
                        <span className="truncate text-muted-foreground" title={(runGroup.meta?.presets ?? runGroup.presets).join(', ')}>{(runGroup.meta?.presets ?? runGroup.presets).join(', ') || 'n/a'}</span>
                        <span className="tabular-nums text-muted-foreground">{runGroup.meta?.rowCount ?? runGroup.selectedRowCount}</span>
                      </button>
                      {isExpanded && (
                        <div className="border-t border-white/8 bg-background/30 px-3 py-3">
                          {runGroup.meta && (
                            <p className="mb-2 text-[11px] text-muted-foreground">
                              Time span: {runGroup.meta.firstTimestamp} to {runGroup.meta.lastTimestamp} · Iteration range: {runGroup.meta.iterationRange} · Routes: {runGroup.meta.routeCount}
                            </p>
                          )}
                          <DataTable
                            title={`Iteration Details · ${runGroup.runLabel}`}
                            columns={trendDetailColumns}
                            data={runGroup.rows}
                            fileName={`iteration-details-${runGroup.runFolder}.csv`}
                            searchPlaceholder="Search iteration rows..."
                            defaultPageSize={10}
                            compact
                            filterableColumns={['framework', 'preset', 'route']}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
      </section>

      {showAuditHeatmap && (
        <section id="diagnostics-heatmap" className="rounded-xl border border-white/8 bg-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-cyan-300/60 mb-0.5">Cross-run analysis</p>
            <h2 className="text-sm font-semibold text-foreground">Audit Index Heatmap</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">Framework × route heatmap showing where failures and improvements cluster.</p>
          </div>
          <Select value={diagnosticHeatMetric} onValueChange={setDiagnosticHeatMetric}>
            <SelectTrigger className="w-52 border-white/10 bg-card text-xs text-foreground focus:ring-cyan-400/50"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-popover border-white/10 text-xs">
              <SelectItem value="failedAudits" className="text-xs focus:bg-white/8">Failed audits (avg)</SelectItem>
              <SelectItem value="diagnosticsItemCount" className="text-xs focus:bg-white/8">Diagnostics items (avg)</SelectItem>
              <SelectItem value="insightAuditCount" className="text-xs focus:bg-white/8">Insights (avg)</SelectItem>
              <SelectItem value="fcpImprovementMs" className="text-xs focus:bg-white/8">FCP improvement potential (ms)</SelectItem>
              <SelectItem value="lcpImprovementMs" className="text-xs focus:bg-white/8">LCP improvement potential (ms)</SelectItem>
              <SelectItem value="performanceGainPotential" className="text-xs focus:bg-white/8">Performance gain potential</SelectItem>
            </SelectContent>
          </Select>
        </div>
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
          height="560px"
          className="border-0 p-0 bg-transparent"
        />
        </section>
      )}
      {showAuditHeatmap && (
        <AuditHeatmapDialog
          open={Boolean(auditCell)}
          onOpenChange={(open) => { if (!open) setAuditCell(null); }}
          cell={auditCell}
          data={auditCellData}
          loading={auditCellLoading}
          error={auditCellError}
        />
      )}
    </div>
  );
}
