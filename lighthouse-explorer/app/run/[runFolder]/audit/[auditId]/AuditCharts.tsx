'use client';

import { useMemo } from 'react';
import PlotCard from '@/components/plot-card';

const COLORS = ['#22d3ee', '#2dd4bf', '#f59e0b', '#f472b6'];

function groupByFramework(rows) {
  const groups = new Map();
  for (const row of rows) {
    const group = groups.get(row.framework) ?? [];
    group.push(row);
    groups.set(row.framework, group);
  }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
}

function hoverText(row, valueLabel, value) {
  return [
    `<b>${row.framework}</b>`,
    `Iteration: ${row.iteration}`,
    `Route: ${row.route}`,
    `Platform: ${row.preset}`,
    `${valueLabel}: ${value}`,
  ].join('<br>');
}

export default function AuditCharts({ occurrences }) {
  const frameworkGroups = useMemo(() => groupByFramework(occurrences), [occurrences]);

  const scoreData = useMemo(() => frameworkGroups.map(([framework, rows], index) => {
    const valid = rows.filter((row) => Number.isFinite(row.score)).sort((a, b) => a.iteration - b.iteration);
    return {
      type: 'scatter', mode: 'lines+markers', name: framework,
      x: valid.map((row) => row.iteration), y: valid.map((row) => row.score * 100),
      text: valid.map((row) => hoverText(row, 'Score', `${(row.score * 100).toFixed(1)}%`)),
      hovertemplate: '%{text}<extra></extra>',
      line: { color: COLORS[index % COLORS.length], width: 2 },
      marker: { color: COLORS[index % COLORS.length], size: 7 },
    };
  }).filter((trace) => trace.x.length), [frameworkGroups]);

  const numericData = useMemo(() => frameworkGroups.map(([framework, rows], index) => {
    const valid = rows.filter((row) => Number.isFinite(row.numericValue)).sort((a, b) => a.iteration - b.iteration);
    return {
      type: 'scatter', mode: 'lines+markers', name: framework,
      x: valid.map((row) => row.iteration), y: valid.map((row) => row.numericValue),
      text: valid.map((row) => hoverText(row, 'Numeric value', `${row.numericValue}${row.numericUnit ? ` ${row.numericUnit}` : ''}`)),
      hovertemplate: '%{text}<extra></extra>',
      line: { color: COLORS[index % COLORS.length], width: 2 },
      marker: { color: COLORS[index % COLORS.length], size: 7 },
    };
  }).filter((trace) => trace.x.length), [frameworkGroups]);

  const distributionData = useMemo(() => {
    const frameworks = frameworkGroups.map(([framework]) => framework);
    const totals = frameworkGroups.map(([, rows]) => rows.length);
    const failures = frameworkGroups.map(([, rows]) => rows.filter((row) => Number.isFinite(row.score) && row.score < 1).length);
    return [
      { type: 'bar', name: 'Failures', x: frameworks, y: failures, marker: { color: COLORS[3] }, hovertemplate: '<b>%{x}</b><br>Failures: %{y}<extra></extra>' },
      { type: 'bar', name: 'Other occurrences', x: frameworks, y: totals.map((total, index) => total - failures[index]), marker: { color: COLORS[1] }, hovertemplate: '<b>%{x}</b><br>Other occurrences: %{y}<extra></extra>' },
    ];
  }, [frameworkGroups]);

  return (
    <section aria-labelledby="audit-charts-heading" className="flex flex-col gap-4">
      <div>
        <p className="text-[10px] uppercase tracking-[0.22em] text-cyan-300/60">Visual analysis</p>
        <h2 id="audit-charts-heading" className="mt-0.5 text-sm font-semibold text-foreground">Audit Behavior by Framework</h2>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        {scoreData.length ? (
          <PlotCard title="Score by iteration" eyebrow="Score behavior" data={scoreData} exportName="audit-score-by-iteration" layout={{ xaxis: { title: 'Iteration' }, yaxis: { title: 'Score (%)', rangemode: 'tozero' }, legend: { title: { text: 'Framework' } } }} />
        ) : (
          <div className="rounded-xl border border-dashed border-white/10 bg-card p-5 text-sm text-muted-foreground">This audit does not expose numeric scores.</div>
        )}
        {numericData.length ? (
          <PlotCard title="Numeric value by iteration" eyebrow="Measured value" data={numericData} exportName="audit-numeric-by-iteration" layout={{ xaxis: { title: 'Iteration' }, yaxis: { title: 'Numeric value', rangemode: 'tozero' }, legend: { title: { text: 'Framework' } } }} />
        ) : (
          <div className="rounded-xl border border-dashed border-white/10 bg-card p-5 text-sm text-muted-foreground">No numeric values are available for this audit. The occurrence distribution remains available below.</div>
        )}
      </div>
      <PlotCard title="Failure and occurrence distribution" eyebrow="Framework distribution" data={distributionData} exportName="audit-failure-distribution" layout={{ barmode: 'stack', xaxis: { title: 'Framework' }, yaxis: { title: 'Occurrences', dtick: 1 }, legend: { orientation: 'h' } }} />
    </section>
  );
}
