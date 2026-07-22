'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import PlotCard from '@/components/plot-card';
import AuditCharts from './AuditCharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type AuditOption = {
  id: string;
  title: string;
  occurrences: number;
  failed: number;
  avgScore: number;
};

type AuditOccurrence = {
  framework: string;
  route: string;
  preset: string;
  iteration: number;
  score: number | null;
  numericValue: number | null;
  numericUnit?: string;
};

export default function AuditScopeCharts({
  runFolder,
  currentAuditId,
  auditOptions,
  occurrences,
}: {
  runFolder: string;
  currentAuditId: string;
  auditOptions: AuditOption[];
  occurrences: AuditOccurrence[];
}) {
  const router = useRouter();
  const [scope, setScope] = useState<'single' | 'all'>('single');

  const selectedAudit = useMemo(
    () => auditOptions.find((audit) => audit.id === currentAuditId),
    [auditOptions, currentAuditId]
  );

  const allScoreData = useMemo(() => [{
    type: 'bar',
    name: 'Average score',
    x: auditOptions.map((audit) => audit.id),
    y: auditOptions.map((audit) => Number.isFinite(audit.avgScore) ? audit.avgScore * 100 : 0),
    text: auditOptions.map((audit) => audit.title),
    hovertemplate: '<b>%{x}</b><br>%{text}<br>Avg score: %{y:.1f}%<extra></extra>',
    marker: { color: '#22d3ee', opacity: 0.88 },
  }], [auditOptions]);

  const allOccurrenceData = useMemo(() => [
    {
      type: 'bar',
      name: 'Failures',
      x: auditOptions.map((audit) => audit.id),
      y: auditOptions.map((audit) => audit.failed),
      marker: { color: '#f59e0b', opacity: 0.88 },
      hovertemplate: '<b>%{x}</b><br>Failures: %{y}<extra></extra>',
    },
    {
      type: 'bar',
      name: 'Other occurrences',
      x: auditOptions.map((audit) => audit.id),
      y: auditOptions.map((audit) => Math.max(0, audit.occurrences - audit.failed)),
      marker: { color: '#2dd4bf', opacity: 0.88 },
      hovertemplate: '<b>%{x}</b><br>Other occurrences: %{y}<extra></extra>',
    },
  ], [auditOptions]);

  return (
    <section className="space-y-4">
      <div className="rounded-xl border border-white/8 bg-card p-3">
        <p className="text-[10px] uppercase tracking-[0.22em] text-cyan-300/60 mb-1">Visualization Scope</p>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={scope} onValueChange={(value) => setScope(value as 'single' | 'all')}>
            <SelectTrigger className="h-7 w-40 border-white/10 bg-card text-xs text-foreground focus:ring-cyan-400/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover border-white/10 text-xs">
              <SelectItem value="single" className="text-xs focus:bg-white/8">Single audit</SelectItem>
              <SelectItem value="all" className="text-xs focus:bg-white/8">All audits</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={currentAuditId}
            onValueChange={(auditId) => {
              setScope('single');
              router.push(`/run/${encodeURIComponent(runFolder)}/audit/${encodeURIComponent(auditId)}`);
            }}
          >
            <SelectTrigger className="h-7 w-64 border-white/10 bg-card text-xs text-foreground focus:ring-cyan-400/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover border-white/10 text-xs max-h-72">
              {auditOptions.map((audit) => (
                <SelectItem key={audit.id} value={audit.id} className="text-xs focus:bg-white/8">
                  {audit.id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {scope === 'all' ? (
        <div className="grid gap-4 xl:grid-cols-2">
          <PlotCard
            eyebrow="All audits"
            title="Average score by audit"
            exportName="audit-score-overview"
            data={allScoreData}
            layout={{
              xaxis: { title: 'Audit ID', tickangle: -25 },
              yaxis: { title: 'Avg score (%)', range: [0, 100] },
              margin: { t: 20, r: 16, l: 60, b: 120 },
            }}
          />
          <PlotCard
            eyebrow="All audits"
            title="Failure and occurrence mix"
            exportName="audit-occurrence-overview"
            data={allOccurrenceData}
            layout={{
              barmode: 'stack',
              xaxis: { title: 'Audit ID', tickangle: -25 },
              yaxis: { title: 'Occurrences', rangemode: 'tozero' },
              legend: { title: { text: 'Type' } },
              margin: { t: 20, r: 16, l: 60, b: 120 },
            }}
          />
        </div>
      ) : (
        <div>
          <p className="mb-3 text-xs text-muted-foreground">
            Showing details for <span className="text-foreground">{selectedAudit?.id ?? currentAuditId}</span>
            {selectedAudit?.title ? ` · ${selectedAudit.title}` : ''}
          </p>
          <AuditCharts occurrences={occurrences} />
        </div>
      )}
    </section>
  );
}
