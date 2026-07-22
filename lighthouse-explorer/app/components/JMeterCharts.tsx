'use client';

import { useMemo, useState } from 'react';
import PlotCard from '@/components/plot-card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { frameworkVersionColor } from '@/lib/framework-colors';
import { type JMeterSummaryRow } from '@/lib/lighthouse-api';

export type MetricKey = 'successRatePct' | 'avgElapsedMs' | 'p95ElapsedMs' | 'avgLatencyMs' | 'avgConnectMs' | 'failureCount';

export const JMETER_METRICS: Array<{ key: MetricKey; label: string; yLabel: string }> = [
  { key: 'successRatePct', label: 'Success rate', yLabel: 'Success rate (%)' },
  { key: 'avgElapsedMs', label: 'Avg elapsed', yLabel: 'Elapsed (ms)' },
  { key: 'p95ElapsedMs', label: 'p95 elapsed', yLabel: 'Elapsed p95 (ms)' },
  { key: 'avgLatencyMs', label: 'Avg latency', yLabel: 'Latency (ms)' },
  { key: 'avgConnectMs', label: 'Avg connect', yLabel: 'Connect (ms)' },
  { key: 'failureCount', label: 'Failures', yLabel: 'Failures' },
];

function metricValue(row: JMeterSummaryRow, metric: MetricKey): number {
  return row[metric];
}

export function JMeterTrendChart({
  rows,
  title = 'JMeter benchmark trend',
  metric,
  onMetricChange,
  showMetricControl = true,
}: {
  rows: JMeterSummaryRow[];
  title?: string;
  metric?: MetricKey;
  onMetricChange?: (metric: MetricKey) => void;
  showMetricControl?: boolean;
}) {
  const [internalMetric, setInternalMetric] = useState<MetricKey>('avgElapsedMs');
  const activeMetric = metric ?? internalMetric;

  function setMetric(nextMetric: MetricKey) {
    if (metric === undefined) {
      setInternalMetric(nextMetric);
    }
    onMetricChange?.(nextMetric);
  }

  const plotData = useMemo(() => {
    const seriesNames = [...new Set(rows.map((row) => row.series))].sort();

    return seriesNames.map((series) => {
      const seriesRows = rows
        .filter((row) => row.series === series)
        .sort((left, right) => left.users - right.users);
      const first = seriesRows[0];
      const color = first ? frameworkVersionColor(`${first.framework}-${first.version}`) : '#22d3ee';
      const isPercent = activeMetric === 'successRatePct';

      return {
        type: 'scatter',
        mode: 'lines+markers',
        name: series,
        x: seriesRows.map((row) => row.users),
        y: seriesRows.map((row) => metricValue(row, activeMetric)),
        marker: { size: 7, color },
        line: { color, width: 2 },
        hovertemplate: isPercent
          ? `<b>${series}</b><br>Users: %{x}<br>${JMETER_METRICS.find((item) => item.key === activeMetric)?.label}: %{y:.1f}%<extra></extra>`
          : `<b>${series}</b><br>Users: %{x}<br>${JMETER_METRICS.find((item) => item.key === activeMetric)?.label}: %{y:.1f}<extra></extra>`,
      };
    });
  }, [activeMetric, rows]);

  const selectedMetric = JMETER_METRICS.find((item) => item.key === activeMetric) ?? JMETER_METRICS[1];

  return (
    <PlotCard
      eyebrow="JMeter load profile"
      title={title}
      controls={showMetricControl ? (
        <Select value={activeMetric} onValueChange={(value) => setMetric(value as MetricKey)}>
          <SelectTrigger className="w-40 border-white/10 bg-card text-xs text-foreground focus:ring-cyan-400/50">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-popover border-white/10 text-xs">
            {JMETER_METRICS.map((item) => (
              <SelectItem key={item.key} value={item.key} className="text-xs focus:bg-white/8">
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : undefined}
      exportName={`jmeter-trend-${activeMetric}`}
      data={plotData}
      layout={{
        xaxis: { title: 'Users', dtick: 100 },
        yaxis: {
          title: selectedMetric.yLabel,
          range: activeMetric === 'successRatePct' ? [0, 100] : undefined,
        },
        legend: { title: { text: 'Framework / version' } },
      }}
      height="360px"
    />
  );
}