'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import DataTable from '@/components/data-table';
import { FrameworkComparison, TrendChart, CategoryProfile } from './LighthouseCharts';
import { JMeterTrendChart, type MetricKey as JMeterMetricKey } from './JMeterCharts';
import LighthouseExplorer from './LighthouseExplorer';
import AuditIndexHeatmapSection, { type DiagnosticMetric } from './AuditIndexHeatmapSection';
import HomepageRunDrilldown from './HomepageRunDrilldown';
import DashboardTopFilters, { type ExtraFilterControl } from './DashboardTopFilters';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MultiSelectCombobox } from '@/components/ui/multi-select-combobox';
import { SingleSelectCombobox } from '@/components/ui/single-select-combobox';
import { METRIC_META, PRIMARY_METRICS, formatMetricValue } from '@/lib/metric-meta';
import { frameworkVersionColor } from '@/lib/framework-colors';
import { cn } from '@/lib/utils';
import { aggregateBy, frameworkKey, summarize } from '@/lib/aggregation';
import { useDashboardStore, useEffectiveSingleRunFolder, type DashboardTab } from '@/lib/dashboard-store';
import { type JMeterFileMeta, type JMeterSummaryRow, type LighthouseFilterState, type LighthouseRow, type LighthouseRunMeta } from '@/lib/lighthouse-api';
import { DIAGNOSTIC_METRICS } from './AuditIndexHeatmapSection';
import { JMETER_METRICS } from './JMeterCharts';

type HomeDashboardProps = {
  rows: LighthouseRow[];
  runs: LighthouseRunMeta[];
  filters: LighthouseFilterState;
  initialSelection: Record<string, unknown>;
  loadError?: string;
  graphTruncated?: boolean;
  graphTotal?: number;
  contractVersion?: string;
  jmeterRows: JMeterSummaryRow[];
  jmeterFiles: JMeterFileMeta[];
  jmeterLoadError?: string;
};

const TREND_CHART_TYPES = ['line', 'scatter', 'bar', 'box', 'violin', 'histogram', 'heatmap'] as const;
type TrendBasis = 'iteration' | 'run';
type TrendChartType = (typeof TREND_CHART_TYPES)[number];

export default function HomeDashboard({ rows, runs, filters, initialSelection, loadError, graphTruncated, graphTotal, contractVersion, jmeterRows, jmeterFiles, jmeterLoadError }: HomeDashboardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const activeTab = useDashboardStore((state) => state.activeTab);
  const hydrateSelection = useDashboardStore((state) => state.hydrateSelection);
  const setActiveTab = useDashboardStore((state) => state.setActiveTab);
  const isTabsFullscreen = useDashboardStore((state) => state.isTabsFullscreen);
  const toggleFullscreen = useDashboardStore((state) => state.toggleFullscreen);
  const setFullscreen = useDashboardStore((state) => state.setFullscreen);
  const selectedRunFolders = useDashboardStore((state) => state.selectedRunFolders);
  const selectedFrameworks = useDashboardStore((state) => state.selectedFrameworks);
  const selectedPresets = useDashboardStore((state) => state.selectedPresets);
  const selectedRoutes = useDashboardStore((state) => state.selectedRoutes);
  const goToAudit = useDashboardStore((state) => state.goToAudit);
  const setHeaderKpis = useDashboardStore((state) => state.setHeaderKpis);
  const effectiveSingleRunFolder = useEffectiveSingleRunFolder();
  const didHydrateRef = useRef(false);

  useEffect(() => {
    if (didHydrateRef.current) return;
    didHydrateRef.current = true;
    hydrateSelection({
      selectedRunFolders: Array.isArray(initialSelection?.selectedRunFolders)
        ? (initialSelection.selectedRunFolders as string[])
        : filters.runFolders,
      selectedFrameworks: Array.isArray(initialSelection?.selectedFrameworks)
        ? (initialSelection.selectedFrameworks as string[])
        : filters.frameworks,
      selectedPresets: Array.isArray(initialSelection?.selectedPresets)
        ? (initialSelection.selectedPresets as string[])
        : filters.presets,
      selectedRoutes: Array.isArray(initialSelection?.selectedRoutes)
        ? (initialSelection.selectedRoutes as string[])
        : filters.routes,
      activeTab: typeof initialSelection?.activeTab === 'string' ? initialSelection.activeTab as DashboardTab : undefined,
    });
  }, [filters.frameworks, filters.presets, filters.routes, filters.runFolders, hydrateSelection, initialSelection]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedRunFolders.length && selectedRunFolders.length !== filters.runFolders.length) {
      params.set('runs', selectedRunFolders.join(','));
    }
    if (selectedFrameworks.length && selectedFrameworks.length !== filters.frameworks.length) {
      params.set('frameworks', selectedFrameworks.join(','));
    }
    if (selectedPresets.length && selectedPresets.length !== filters.presets.length) {
      params.set('presets', selectedPresets.join(','));
    }
    if (selectedRoutes.length && selectedRoutes.length !== filters.routes.length) {
      params.set('routes', selectedRoutes.join(','));
    }
    if (activeTab !== 'summary') {
      params.set('tab', activeTab);
    }

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [activeTab, filters.frameworks.length, filters.presets.length, filters.routes.length, filters.runFolders.length, pathname, router, selectedFrameworks, selectedPresets, selectedRoutes, selectedRunFolders]);

  const scopedRows = useMemo(() => rows.filter((row) => {
    if (selectedRunFolders.length && !selectedRunFolders.includes(row.runFolder)) return false;
    if (selectedFrameworks.length && !selectedFrameworks.includes(frameworkKey(row))) return false;
    if (selectedPresets.length && !selectedPresets.includes(row.preset)) return false;
    if (selectedRoutes.length && !selectedRoutes.includes(row.route)) return false;
    return true;
  }), [rows, selectedFrameworks, selectedPresets, selectedRoutes, selectedRunFolders]);

  const kpis = useMemo(() => ({
    runs: String(new Set(scopedRows.map((row) => row.runFolder)).size),
    frameworks: String(new Set(scopedRows.map((row) => `${row.framework}-${row.version}`)).size),
    presets: String(new Set(scopedRows.map((row) => row.preset)).size),
    routes: String(new Set(scopedRows.map((row) => row.route)).size),
  }), [scopedRows]);

  useEffect(() => {
    setHeaderKpis(kpis);
    return () => setHeaderKpis(null);
  }, [kpis, setHeaderKpis]);

  const scopedJmeterRows = useMemo(() => {
    if (!selectedFrameworks.length) return jmeterRows;
    const selected = new Set(selectedFrameworks);
    const matched = jmeterRows.filter((row) => selected.has(`${row.framework}-${row.version}`));
    // If current framework scope has no JMeter overlap (for example stale persisted filters),
    // fall back to all JMeter rows instead of showing an empty chart/table.
    return matched.length ? matched : jmeterRows;
  }, [jmeterRows, selectedFrameworks]);

  const scopedJmeterFiles = useMemo(() => {
    const included = new Set(scopedJmeterRows.map((row) => row.fileName));
    return jmeterFiles.filter((file) => included.has(file.fileName));
  }, [jmeterFiles, scopedJmeterRows]);

  const platformSummaryRows = useMemo(() => {
    const grouped = aggregateBy(scopedRows, (row) => `${frameworkKey(row)}|${row.route}|${row.preset}`);
    const summaryRows: Array<Record<string, unknown>> = [];
    for (const [key, groupedRows] of grouped.entries()) {
      const [framework, route, preset] = key.split('|');
      for (const metric of PRIMARY_METRICS) {
        const values = groupedRows.map((row) => Number(row[metric])).filter(Number.isFinite);
        if (!values.length) continue;
        const stats = summarize(values);
        summaryRows.push({
          framework,
          route,
          preset,
          metric: METRIC_META[metric]?.label ?? metric,
          n: values.length,
          mean: formatMetricValue(metric, stats.mean),
          median: formatMetricValue(metric, stats.median),
          stdDev: stats.stdDev.toFixed(2),
          iqr: formatMetricValue(metric, stats.iqr),
          p90: formatMetricValue(metric, stats.p90),
          p95: formatMetricValue(metric, stats.p95),
        });
      }
    }
    return summaryRows.sort((left, right) => String(left.framework).localeCompare(String(right.framework)) || String(left.route).localeCompare(String(right.route)) || String(left.preset).localeCompare(String(right.preset)) || String(left.metric).localeCompare(String(right.metric)));
  }, [scopedRows]);

  const statsColumns = useMemo(() => [
    { accessorKey: 'framework', header: 'Framework', enableSorting: true },
    { accessorKey: 'route', header: 'Route', enableSorting: true },
    { accessorKey: 'preset', header: 'Platform', enableSorting: true },
    { accessorKey: 'metric', header: 'Metric', enableSorting: true },
    { accessorKey: 'n', header: 'n', enableSorting: true },
    { accessorKey: 'mean', header: 'Mean', enableSorting: true },
    { accessorKey: 'median', header: 'Median', enableSorting: true },
    { accessorKey: 'stdDev', header: 'Std Dev', enableSorting: true },
    { accessorKey: 'iqr', header: 'IQR', enableSorting: true },
    { accessorKey: 'p90', header: 'p90', enableSorting: true },
    { accessorKey: 'p95', header: 'p95', enableSorting: true },
  ], []);

  const jmeterColumns = useMemo(() => [
    { accessorKey: 'fileName', header: 'File', enableSorting: true },
    { accessorKey: 'users', header: 'Users', enableSorting: true },
    { accessorKey: 'series', header: 'Series', enableSorting: true },
    { accessorKey: 'framework', header: 'Framework', enableSorting: true },
    { accessorKey: 'version', header: 'Version', enableSorting: true },
    { accessorKey: 'sampleCount', header: 'Samples', enableSorting: true },
    {
      accessorKey: 'successRatePct',
      header: 'Success rate',
      enableSorting: true,
      cell: ({ getValue }: { getValue: () => unknown }) => `${Number(getValue()).toFixed(1)}%`,
    },
    {
      accessorKey: 'avgElapsedMs',
      header: 'Avg elapsed',
      enableSorting: true,
      cell: ({ getValue }: { getValue: () => unknown }) => `${Number(getValue()).toFixed(0)} ms`,
    },
    {
      accessorKey: 'p95ElapsedMs',
      header: 'p95 elapsed',
      enableSorting: true,
      cell: ({ getValue }: { getValue: () => unknown }) => `${Number(getValue()).toFixed(0)} ms`,
    },
    {
      accessorKey: 'maxElapsedMs',
      header: 'Max elapsed',
      enableSorting: true,
      cell: ({ getValue }: { getValue: () => unknown }) => `${Number(getValue()).toFixed(0)} ms`,
    },
    {
      accessorKey: 'avgLatencyMs',
      header: 'Avg latency',
      enableSorting: true,
      cell: ({ getValue }: { getValue: () => unknown }) => `${Number(getValue()).toFixed(0)} ms`,
    },
    {
      accessorKey: 'avgConnectMs',
      header: 'Avg connect',
      enableSorting: true,
      cell: ({ getValue }: { getValue: () => unknown }) => `${Number(getValue()).toFixed(0)} ms`,
    },
    { accessorKey: 'failureCount', header: 'Failures', enableSorting: true },
  ], []);


  const frameworkLegendItems = useMemo(() => [...new Set(scopedRows.map((row) => `${row.framework}-${row.version}`))]
    .sort((left, right) => left.localeCompare(right)), [scopedRows]);

  const [visibleFrameworks, setVisibleFrameworks] = useState<string[]>(frameworkLegendItems);
  const [jmeterMetric, setJmeterMetric] = useState<JMeterMetricKey>('avgElapsedMs');
  const [trendBasis, setTrendBasis] = useState<TrendBasis>('iteration');
  const [trendMetric, setTrendMetric] = useState<string>((initialSelection?.trendMetric as string | undefined) ?? 'largestContentfulPaintMs');
  const [trendChartType, setTrendChartType] = useState<TrendChartType>(((initialSelection?.trendChartType as TrendChartType | undefined) ?? 'line'));
  const [trendSelectedIterations, setTrendSelectedIterations] = useState<number[]>([]);
  const [diagnosticHeatMetric, setDiagnosticHeatMetric] = useState<DiagnosticMetric>('failedAudits');

  const availableTrendIterations = useMemo(
    () => [...new Set<number>(scopedRows.map((row) => Number(row.iteration)))].filter(Number.isFinite).sort((a, b) => a - b),
    [scopedRows]
  );

  useEffect(() => {
    if (!availableTrendIterations.length) {
      if (trendSelectedIterations.length) setTrendSelectedIterations([]);
      return;
    }
    setTrendSelectedIterations((current) => current.filter((iteration) => availableTrendIterations.includes(iteration)));
  }, [availableTrendIterations]);

  useEffect(() => {
    if (trendBasis !== 'run' && trendSelectedIterations.length) {
      setTrendSelectedIterations([]);
    }
  }, [trendBasis, trendSelectedIterations.length]);

  useEffect(() => {
    setVisibleFrameworks(frameworkLegendItems);
  }, [frameworkLegendItems]);

  const tabExtraFilters = useMemo<ExtraFilterControl[]>(() => {
    if (activeTab === 'trend') {
      const extras: ExtraFilterControl[] = [
        {
          key: 'trend-basis',
          label: 'Basis',
          control: (
            <SingleSelectCombobox
              options={[
                { value: 'iteration', label: 'Iteration-based' },
                { value: 'run', label: 'Run-based' },
              ]}
              selected={trendBasis}
              onChange={(value) => setTrendBasis(value as TrendBasis)}
              placeholder="Select basis"
              searchPlaceholder="Search basis..."
            />
          ),
        },
      ];

      if (trendBasis === 'run') {
        extras.push({
          key: 'trend-iterations',
          label: 'Iterations',
          control: (
            <MultiSelectCombobox
              placeholder="All iterations"
              searchPlaceholder="Search iterations..."
              options={availableTrendIterations.map((iteration) => ({ value: String(iteration), label: `Iteration ${iteration}` }))}
              selected={trendSelectedIterations.map(String)}
              onChange={(next) => setTrendSelectedIterations(next.map(Number))}
            />
          ),
        });
      }

      extras.push(
        {
          key: 'trend-metric',
          label: 'Metric',
          control: (
            <SingleSelectCombobox
              options={PRIMARY_METRICS.map((metric) => ({ value: metric, label: METRIC_META[metric]?.label ?? metric }))}
              selected={trendMetric}
              onChange={setTrendMetric}
              placeholder="Select metric"
              searchPlaceholder="Search metric..."
            />
          ),
        },
        {
          key: 'trend-chart-type',
          label: 'Chart type',
          control: (
            <SingleSelectCombobox
              options={TREND_CHART_TYPES.map((chartType) => ({ value: chartType, label: chartType }))}
              selected={trendChartType}
              onChange={(value) => setTrendChartType(value as TrendChartType)}
              placeholder="Select chart type"
              searchPlaceholder="Search chart type..."
            />
          ),
        }
      );

      return extras;
    }

    if (activeTab === 'heatmap') {
      return [{
        key: 'heatmap-metric',
        label: 'Heatmap metric',
        control: (
          <SingleSelectCombobox
            options={DIAGNOSTIC_METRICS.map(([value, label]) => ({ value, label }))}
            selected={diagnosticHeatMetric}
            onChange={(value) => setDiagnosticHeatMetric(value as DiagnosticMetric)}
            placeholder="Select heatmap metric"
            searchPlaceholder="Search heatmap metric..."
          />
        ),
      }];
    }

    if (activeTab === 'jmeter') {
      return [{
        key: 'jmeter-metric',
        label: 'JMeter metric',
        control: (
          <SingleSelectCombobox
            options={JMETER_METRICS.map((item) => ({ value: item.key, label: item.label }))}
            selected={jmeterMetric}
            onChange={(value) => setJmeterMetric(value as JMeterMetricKey)}
            placeholder="Select JMeter metric"
            searchPlaceholder="Search JMeter metric..."
          />
        ),
      }];
    }

    return [];
  }, [activeTab, availableTrendIterations, diagnosticHeatMetric, jmeterMetric, trendBasis, trendChartType, trendMetric, trendSelectedIterations]);

  useEffect(() => {
    if (!isTabsFullscreen) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isTabsFullscreen]);

  useEffect(() => {
    if (!isTabsFullscreen) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setFullscreen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isTabsFullscreen, setFullscreen]);

  const summaryRows = useMemo(() => scopedRows.filter((row) => visibleFrameworks.includes(`${row.framework}-${row.version}`)), [scopedRows, visibleFrameworks]);

  function toggleFrameworkVisibility(framework: string) {
    setVisibleFrameworks((current) => {
      if (current.includes(framework)) {
        if (current.length === 1) return current;
        return current.filter((entry) => entry !== framework);
      }
      return [...current, framework].sort((left, right) => left.localeCompare(right));
    });
  }

  function isolateFramework(framework: string) {
    setVisibleFrameworks((current) => (current.length === 1 && current[0] === framework ? frameworkLegendItems : [framework]));
  }

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col gap-5 overflow-hidden">
      {loadError && (
        <section className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-4">
          <p className="text-xs font-medium text-rose-200">Could not load Lighthouse API data.</p>
          <p className="mt-1 text-xs text-rose-100/80 break-all">{loadError}</p>
        </section>
      )}

      {!loadError && graphTruncated && (
        <section className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-4">
          <p className="text-xs font-medium text-amber-100">Graph rows were windowed by the API for performance safety.</p>
          <p className="mt-1 text-xs text-amber-100/80">
            Showing {rows.length.toLocaleString()} rows from {Number(graphTotal ?? rows.length).toLocaleString()} total rows.
            Refine filters to reduce scope for deeper analysis.
          </p>
        </section>
      )}

      <section className="rounded-xl border border-white/8 bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.28em] text-cyan-300/60">Scientific Evaluation</p>
            <h1 className="mt-1 text-xl font-semibold text-foreground">Lighthouse Results Explorer</h1>
            <p className="mt-1.5 max-w-2xl text-xs text-muted-foreground leading-relaxed">
              Detailed and summarized analysis from summary CSV + JSON report internals across all dated runs.
            </p>
          </div>
        </div>
      </section>

      <section className={cn(
        'flex min-h-0 flex-1 flex-col rounded-xl border border-white/8 bg-card p-4',
        isTabsFullscreen && 'fixed inset-3 z-50 h-[calc(100vh-1.5rem)] max-h-[calc(100vh-1.5rem)] shadow-2xl'
      )}>
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as DashboardTab)} className="flex min-h-0 flex-1 flex-col">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/8 pb-3">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <TabsList className="flex-wrap gap-1 bg-white/5 p-1">
                <TabsTrigger value="summary">Summary Statistics</TabsTrigger>
                <TabsTrigger value="trend">Iteration / Run Trend</TabsTrigger>
                <TabsTrigger value="heatmap">Audit Index Heatmap</TabsTrigger>
                <TabsTrigger value="jmeter">JMeter Benchmark</TabsTrigger>
              </TabsList>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleFullscreen}
                className="rounded-md border border-white/12 bg-white/5 px-2.5 py-1 text-xs text-foreground/90 transition-colors hover:border-cyan-400/35 hover:bg-cyan-400/10"
              >
                {isTabsFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
              </button>
            </div>
          </div>

          <DashboardTopFilters
            filters={filters}
            extraFilters={tabExtraFilters}
          />

          <div className={cn('mt-4 min-h-0 flex-1 pr-1', activeTab === 'heatmap' ? 'overflow-hidden' : 'overflow-y-auto')}>
            <TabsContent value="summary" className="mt-0">
            <div className="space-y-6">
              <div className="grid gap-4 xl:grid-cols-[1fr_1fr_1fr_280px] xl:items-start">
                <FrameworkComparison rows={summaryRows} title="Framework performance benchmark" showLegend={false} height="420px" fillHeight className="h-full" />
                <TrendChart rows={summaryRows} title="Run-over-run performance" showLegend={false} height="420px" fillHeight className="h-full" />
                <CategoryProfile rows={summaryRows} title="Category health across all runs" showLegend={false} height="420px" fillHeight className="h-full" />
                <section className="rounded-xl border border-white/8 bg-card p-4 h-full">
                  <div className="flex flex-col gap-2">
                    {frameworkLegendItems.map((framework) => (
                      <button
                        key={framework}
                        type="button"
                        onClick={() => toggleFrameworkVisibility(framework)}
                        onDoubleClick={() => isolateFramework(framework)}
                        className={cn(
                          'inline-flex w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-left text-xs transition-colors',
                          visibleFrameworks.includes(framework)
                            ? 'border-white/10 text-muted-foreground hover:bg-white/6'
                            : 'border-white/5 text-muted-foreground/45 hover:bg-white/6'
                        )}
                        title="Click to show/hide. Double-click to isolate this framework."
                      >
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: frameworkVersionColor(framework) }}
                          aria-hidden
                        />
                        <span className={cn('text-foreground/90', !visibleFrameworks.includes(framework) && 'line-through opacity-55')}>
                          {framework}
                        </span>
                      </button>
                    ))}
                  </div>
                </section>
              </div>
              <section className="rounded-xl border border-white/8 bg-card p-4">
                <p className="text-[10px] uppercase tracking-[0.22em] text-cyan-300/60 mb-0.5">All data</p>
                <h2 className="text-sm font-semibold text-foreground mb-4">Platform Summary Statistics</h2>
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

              {effectiveSingleRunFolder && (
                <HomepageRunDrilldown
                  runFolder={effectiveSingleRunFolder}
                  onSelectAudit={goToAudit}
                />
              )}
            </div>
            </TabsContent>

            <TabsContent value="trend" className="mt-0">
            <LighthouseExplorer
              dataset={{ rows: scopedRows, runs: runs.filter((run) => scopedRows.some((row) => row.runFolder === run.runFolder)), source: 'api', sourceLabel: 'Backend Lighthouse API' }}
              filters={filters}
              initialSelection={initialSelection}
              showHeader={false}
              showKpis={false}
              showStatsTable={false}
              showAuditHeatmap={false}
              showTopFiltersCard={false}
              trendBasis={trendBasis}
              onTrendBasisChange={setTrendBasis}
              trendMetric={trendMetric}
              onTrendMetricChange={setTrendMetric}
              trendChartType={trendChartType}
              onTrendChartTypeChange={(value) => setTrendChartType(value as TrendChartType)}
              selectedIterations={trendSelectedIterations}
              onSelectedIterationsChange={setTrendSelectedIterations}
            />
            </TabsContent>

            <TabsContent value="heatmap" className="mt-0 h-full data-[state=active]:flex data-[state=active]:flex-col">
              <AuditIndexHeatmapSection
                rows={scopedRows}
                filters={filters}
                showTopFiltersCard={false}
                diagnosticHeatMetric={diagnosticHeatMetric}
                onDiagnosticHeatMetricChange={setDiagnosticHeatMetric}
              />
            </TabsContent>

            <TabsContent value="jmeter" className="mt-0">
            <div className="space-y-6">
              {jmeterLoadError && (
                <section className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-4">
                  <p className="text-xs font-medium text-rose-200">Could not load JMeter data.</p>
                  <p className="mt-1 text-xs text-rose-100/80 break-all">{jmeterLoadError}</p>
                </section>
              )}

              {!jmeterLoadError && (
                <>
                  <div>
                    <JMeterTrendChart rows={scopedJmeterRows} title="JMeter response trend" metric={jmeterMetric} onMetricChange={setJmeterMetric} showMetricControl={false} />
                  </div>
                  <section className="rounded-xl border border-white/8 bg-card p-4">
                    <p className="text-[10px] uppercase tracking-[0.22em] text-cyan-300/60 mb-0.5">Load test data</p>
                    <h2 className="text-sm font-semibold text-foreground mb-2">JMeter Summary Statistics</h2>
                    <p className="mb-4 text-xs text-muted-foreground">
                      {scopedJmeterFiles.length > 0
                        ? `Files: ${scopedJmeterFiles.map((file) => file.fileName).join(', ')}`
                        : 'No JMeter files found.'}
                    </p>
                    <DataTable
                      title="JMeter Summary Statistics"
                      columns={jmeterColumns}
                      data={scopedJmeterRows}
                      fileName="jmeter-summary-static.csv"
                      searchPlaceholder="Search JMeter stats..."
                      defaultPageSize={10}
                      compact
                    />
                  </section>
                </>
              )}
            </div>
            </TabsContent>
          </div>
        </Tabs>
      </section>
    </div>
  );
}