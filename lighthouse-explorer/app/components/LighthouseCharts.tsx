'use client';

import { useMemo, useState } from 'react';
import PlotCard from '@/components/plot-card';
import { METRIC_META } from '@/lib/metric-meta';
import { frameworkVersionColor } from '@/lib/framework-colors';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

type LighthouseRow = {
  framework: string;
  version: string;
  preset: string;
  runFolder: string;
  iteration: number;
  [key: string]: unknown;
};

function average(rows: LighthouseRow[], field: string): number {
  const values = rows.map((row) => Number(row[field])).filter(Number.isFinite);
  return values.length ? values.reduce((s, v) => s + v, 0) / values.length : 0;
}

function frameworkName(row: LighthouseRow): string {
  return `${row.framework}-${row.version}`;
}

// ── SourceNotice ─────────────────────────────────────────────────────────────

export function SourceNotice({ source, sourceLabel }: { source: string; sourceLabel: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-cyan-400/15 bg-cyan-400/5 px-4 py-3">
      <div>
        <p className="text-sm font-medium text-cyan-100">
          {source === 'mock' ? 'Demo dataset active' : 'Filesystem dataset active'}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">{sourceLabel}</p>
      </div>
      <Badge variant="outline" className="border-white/10 text-muted-foreground text-[10px] uppercase tracking-[0.18em]">
        Server rendered
      </Badge>
    </div>
  );
}

// ── FrameworkComparison ───────────────────────────────────────────────────────

export function FrameworkComparison({ rows, title = 'Framework comparison', showLegend = true, height = '360px', fillHeight = false, className }: { rows: LighthouseRow[]; title?: string; showLegend?: boolean; height?: string; fillHeight?: boolean; className?: string }) {
  const [metric, setMetric] = useState('performanceScore');
  const [preset, setPreset] = useState('all');
  const [variant, setVariant] = useState<'bars' | 'dots'>('bars');

  const presets = useMemo(() => [...new Set(rows.map((r) => r.preset))].sort(), [rows]);
  const meta = METRIC_META[metric] ?? { label: metric, lowerIsBetter: false, scale: 1 };

  const data = useMemo(() => {
    const filtered = preset === 'all' ? rows : rows.filter((r) => r.preset === preset);
    return [...new Set(filtered.map(frameworkName))].map((fw) => {
      const group = filtered.filter((r) => frameworkName(r) === fw);
      return { fw, value: average(group, metric) * meta.scale };
    }).sort((a, b) => meta.lowerIsBetter ? a.value - b.value : b.value - a.value);
  }, [metric, preset, rows, meta]);

  const plotData = data.map((entry) => {
    const common = {
      name: entry.fw,
      x: [entry.fw],
      y: [entry.value],
      marker: { color: frameworkVersionColor(entry.fw), opacity: 0.88, size: 8 },
      hovertemplate: `<b>${entry.fw}</b><br>${meta.label}: %{y:.${meta.digits ?? 1}f}${meta.unit}<extra></extra>`,
      hoverlabel: { bgcolor: 'rgba(8,15,30,0.97)', font: { color: '#e2ecfd' } },
      showlegend: showLegend,
    };

    if (variant === 'dots') {
      return {
        ...common,
        type: 'scatter',
        mode: 'markers',
      };
    }

    return {
      ...common,
      type: 'bar',
    };
  });

  const controls = (
    <>
      <Select value={metric} onValueChange={setMetric}>
        <SelectTrigger className="w-36 border-white/10 bg-card text-xs text-foreground focus:ring-cyan-400/50">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-popover border-white/10 text-xs">
          {Object.entries(METRIC_META).map(([key, m]) => (
            <SelectItem key={key} value={key} className="text-xs focus:bg-white/8">{m.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={preset} onValueChange={setPreset}>
        <SelectTrigger className="w-28 border-white/10 bg-card text-xs text-foreground focus:ring-cyan-400/50">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-popover border-white/10 text-xs">
          <SelectItem value="all" className="text-xs focus:bg-white/8">All presets</SelectItem>
          {presets.map((p) => (
            <SelectItem key={p} value={p} className="text-xs focus:bg-white/8">{p}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={variant} onValueChange={(value) => setVariant(value as 'bars' | 'dots')}>
        <SelectTrigger className="w-24 border-white/10 bg-card text-xs text-foreground focus:ring-cyan-400/50">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-popover border-white/10 text-xs">
          <SelectItem value="bars" className="text-xs focus:bg-white/8">Bars</SelectItem>
          <SelectItem value="dots" className="text-xs focus:bg-white/8">Dots</SelectItem>
        </SelectContent>
      </Select>
    </>
  );

  return (
    <PlotCard
      eyebrow="Cross-framework median signal"
      title={title}
      controls={controls}
      exportName="framework-comparison"
      data={plotData}
      layout={{
        xaxis: { title: 'Framework', tickangle: -18 },
        yaxis: { title: meta.axisLabel ?? meta.label },
        showlegend: showLegend,
        legend: { title: { text: 'Framework' } },
        margin: { t: 20, r: 16, l: 60, b: 72 },
      }}
      height={height}
      fillHeight={fillHeight}
      className={className}
    />
  );
}

// ── TrendChart ─────────────────────────────────────────────────────────────────

export function TrendChart({ rows, dimension = 'run', title = 'Performance trend', showLegend = true, height = '360px', fillHeight = false, className }: { rows: LighthouseRow[]; dimension?: 'run' | 'iteration'; title?: string; showLegend?: boolean; height?: string; fillHeight?: boolean; className?: string }) {
  const [variant, setVariant] = useState<'lines' | 'markers' | 'bars'>('lines');
  const frameworks = useMemo(() => [...new Set(rows.map(frameworkName))].sort(), [rows]);

  const plotData = useMemo(() => {
    const keys = [...new Set(rows.map((r) => dimension === 'iteration' ? r.iteration : r.runFolder))]
      .sort((a, b) => dimension === 'iteration' ? Number(a) - Number(b) : String(a).localeCompare(String(b)));

    return frameworks.map((fw) => {
      const color = frameworkVersionColor(fw);
      const x = keys.map((k) => dimension === 'iteration' ? `Iter ${k}` : String(k).slice(0, 10));
      const y = keys.map((k) => {
        const group = rows.filter((r) =>
          (dimension === 'iteration' ? r.iteration : r.runFolder) === k && frameworkName(r) === fw
        );
        return average(group, 'performanceScore') * 100;
      });
      return {
        type: variant === 'bars' ? 'bar' : 'scatter',
        mode: variant === 'markers' ? 'markers' : 'lines+markers',
        name: fw,
        x,
        y,
        marker: { size: 6, color },
        line: { color, width: 2 },
        showlegend: showLegend,
        hovertemplate: `<b>${fw}</b><br>%{x}<br>Performance: %{y:.1f}%<extra></extra>`,
      };
    });
  }, [rows, dimension, frameworks, variant, showLegend]);

  const controls = (
    <Select value={variant} onValueChange={(value) => setVariant(value as 'lines' | 'markers' | 'bars')}>
      <SelectTrigger className="w-28 border-white/10 bg-card text-xs text-foreground focus:ring-cyan-400/50">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="bg-popover border-white/10 text-xs">
        <SelectItem value="lines" className="text-xs focus:bg-white/8">Lines</SelectItem>
        <SelectItem value="markers" className="text-xs focus:bg-white/8">Markers</SelectItem>
        <SelectItem value="bars" className="text-xs focus:bg-white/8">Bars</SelectItem>
      </SelectContent>
    </Select>
  );

  return (
    <PlotCard
      eyebrow="Regression watch"
      title={title}
      controls={controls}
      exportName="performance-trend"
      data={plotData}
      layout={{
        xaxis: { title: dimension === 'iteration' ? 'Iteration' : 'Run' },
        yaxis: { title: 'Performance Score (%)', range: [40, 105] },
        showlegend: showLegend,
        legend: { title: { text: 'Framework' } },
      }}
      height={height}
      fillHeight={fillHeight}
      className={className}
    />
  );
}

// ── CategoryProfile ───────────────────────────────────────────────────────────

export function CategoryProfile({ rows, title = 'Category profile', showLegend = true, height = '360px', fillHeight = false, className }: { rows: LighthouseRow[]; title?: string; showLegend?: boolean; height?: string; fillHeight?: boolean; className?: string }) {
  const [variant, setVariant] = useState<'grouped' | 'stacked' | 'percent'>('grouped');
  const categories = [
    { label: 'Performance', field: 'categoryPerformance' },
    { label: 'Accessibility', field: 'categoryAccessibility' },
    { label: 'Best Practices', field: 'categoryBestPractices' },
    { label: 'SEO', field: 'categorySeo' },
  ];
  const frameworks = useMemo(() => [...new Set(rows.map(frameworkName))].sort(), [rows]);

  const plotData = frameworks.map((framework) => {
    const entry = {
      type: 'bar',
      name: framework,
      x: categories.map((c) => c.label),
      y: categories.map((c) => average(rows.filter((row) => frameworkName(row) === framework), c.field) * 100),
      marker: {
        color: frameworkVersionColor(framework),
        opacity: 0.88,
      },
      showlegend: showLegend,
      hovertemplate: `<b>${framework}</b><br>%{x}<br>Score: %{y:.1f}%<extra></extra>`,
    } as Record<string, unknown>;

    if (variant === 'grouped') {
      entry.offsetgroup = framework;
    }

    return entry;
  });

  const controls = (
    <Select value={variant} onValueChange={(value) => setVariant(value as 'grouped' | 'stacked' | 'percent')}>
      <SelectTrigger className="w-32 border-white/10 bg-card text-xs text-foreground focus:ring-cyan-400/50">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="bg-popover border-white/10 text-xs">
        <SelectItem value="grouped" className="text-xs focus:bg-white/8">Grouped bars</SelectItem>
        <SelectItem value="stacked" className="text-xs focus:bg-white/8">Stacked bars</SelectItem>
        <SelectItem value="percent" className="text-xs focus:bg-white/8">100% stack</SelectItem>
      </SelectContent>
    </Select>
  );

  return (
    <PlotCard
      eyebrow="Lighthouse categories"
      title={title}
      controls={controls}
      exportName="category-profile"
      data={plotData}
      layout={{
        barmode: variant === 'grouped' ? 'group' : 'stack',
        barnorm: variant === 'percent' ? 'percent' : undefined,
        xaxis: { title: 'Category', automargin: true },
        yaxis: { title: variant === 'percent' ? 'Share (%)' : 'Score (%)', range: variant === 'percent' ? [0, 100] : [0, 105] },
        showlegend: showLegend,
        legend: { title: { text: 'Framework' } },
        margin: { t: 20, r: 18, l: 60, b: 64 },
      }}
      height={height}
      fillHeight={fillHeight}
      className={className}
    />
  );
}
