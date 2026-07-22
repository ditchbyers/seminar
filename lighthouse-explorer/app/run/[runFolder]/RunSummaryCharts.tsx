'use client';

import { useEffect, useMemo, useState } from 'react';
import { FrameworkComparison, TrendChart, CategoryProfile } from '../../components/LighthouseCharts';
import { frameworkVersionColor } from '@/lib/framework-colors';
import { cn } from '@/lib/utils';

type LighthouseRow = {
  framework: string;
  version: string;
  preset: string;
  runFolder: string;
  iteration: number;
  [key: string]: unknown;
};

export default function RunSummaryCharts({ rows }: { rows: LighthouseRow[] }) {
  const frameworkLegendItems = useMemo(() => [...new Set(rows.map((row) => `${row.framework}-${row.version}`))]
    .sort((left, right) => left.localeCompare(right)), [rows]);

  const [visibleFrameworks, setVisibleFrameworks] = useState<string[]>(frameworkLegendItems);

  useEffect(() => {
    setVisibleFrameworks((current) => {
      if (!frameworkLegendItems.length) return [];
      if (!current.length) return frameworkLegendItems;
      const available = new Set(frameworkLegendItems);
      const kept = current.filter((framework) => available.has(framework));
      return kept.length ? kept : frameworkLegendItems;
    });
  }, [frameworkLegendItems]);

  const summaryRows = useMemo(
    () => rows.filter((row) => visibleFrameworks.includes(`${row.framework}-${row.version}`)),
    [rows, visibleFrameworks]
  );

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
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_220px]">
      <FrameworkComparison rows={summaryRows} title="Framework performance in this run" showLegend={false} />
      <TrendChart rows={summaryRows} dimension="iteration" title="Iteration stability by framework" showLegend={false} />
      <CategoryProfile rows={summaryRows} title="Category profile for this run" showLegend={false} />

      <section className="rounded-xl border border-white/8 bg-card p-4 xl:sticky xl:top-0">
        <p className="text-[10px] uppercase tracking-[0.22em] text-cyan-300/60 mb-0.5">Legend</p>
        <h3 className="text-sm font-semibold text-foreground mb-3">Frameworks</h3>
        <div className="space-y-2">
          {frameworkLegendItems.map((framework) => (
            <button
              key={framework}
              type="button"
              onClick={() => toggleFrameworkVisibility(framework)}
              onDoubleClick={() => isolateFramework(framework)}
              className={cn(
                'flex w-full items-center gap-2 rounded px-1.5 py-1 text-left text-xs transition-colors',
                visibleFrameworks.includes(framework)
                  ? 'text-muted-foreground hover:bg-white/6'
                  : 'text-muted-foreground/45 hover:bg-white/6'
              )}
              title="Click to show or hide. Double-click to isolate this framework."
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
  );
}
