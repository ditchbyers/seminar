'use client';

import { useMemo, useState } from 'react';
import { FrameworkComparison, TrendChart, CategoryProfile } from '../../../../components/LighthouseCharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type LighthouseRow = {
  framework: string;
  version: string;
  preset: string;
  runFolder: string;
  iteration: number;
  [key: string]: unknown;
};

export default function IterationScopeCharts({ rows, iterations, currentIteration }: { rows: LighthouseRow[]; iterations: number[]; currentIteration: number }) {
  const [scope, setScope] = useState<'single' | 'all'>('single');
  const [selectedIteration, setSelectedIteration] = useState<number>(currentIteration);

  const scopedRows = useMemo(() => {
    if (scope === 'all') return rows;
    return rows.filter((row) => Number(row.iteration) === selectedIteration);
  }, [rows, scope, selectedIteration]);

  const titleSuffix = scope === 'all' ? 'all iterations' : `iteration ${selectedIteration}`;

  return (
    <section className="space-y-4">
      <div className="rounded-xl border border-white/8 bg-card p-3">
        <p className="text-[10px] uppercase tracking-[0.22em] text-cyan-300/60 mb-1">Visualization Scope</p>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={scope} onValueChange={(value) => setScope(value as 'single' | 'all')}>
            <SelectTrigger className="h-7 w-44 border-white/10 bg-card text-xs text-foreground focus:ring-cyan-400/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover border-white/10 text-xs">
              <SelectItem value="single" className="text-xs focus:bg-white/8">Single iteration</SelectItem>
              <SelectItem value="all" className="text-xs focus:bg-white/8">All iterations</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={String(selectedIteration)}
            onValueChange={(value) => {
              setSelectedIteration(Number(value));
              setScope('single');
            }}
          >
            <SelectTrigger className="h-7 w-44 border-white/10 bg-card text-xs text-foreground focus:ring-cyan-400/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover border-white/10 text-xs max-h-72">
              {iterations.map((iteration) => (
                <SelectItem key={iteration} value={String(iteration)} className="text-xs focus:bg-white/8">
                  Iteration {iteration}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <FrameworkComparison rows={scopedRows} title={`Framework comparison · ${titleSuffix}`} />
        <TrendChart rows={scopedRows} dimension="iteration" title={`Trend view · ${titleSuffix}`} />
        <CategoryProfile rows={scopedRows} title={`Category profile · ${titleSuffix}`} />
      </div>
    </section>
  );
}
