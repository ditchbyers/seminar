// Shared aggregation/formatting helpers used across HomeDashboard, LighthouseExplorer,
// and AuditIndexHeatmapSection. Extracted to remove duplicated definitions.

export type FrameworkRow = {
  framework: string;
  version: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function frameworkKey(row: any): string {
  return `${row.framework}-${row.version}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function aggregateBy<T = any>(items: T[], keyFn: (item: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = keyFn(item);
    const current = groups.get(key) ?? [];
    current.push(item);
    groups.set(key, current);
  }
  return groups;
}

export function mean(values: number[]): number {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : Number.NaN;
}

function percentile(sortedValues: number[], fraction: number): number {
  if (!sortedValues.length) return Number.NaN;
  if (sortedValues.length === 1) return sortedValues[0];
  const position = (sortedValues.length - 1) * fraction;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  if (lower === upper) return sortedValues[lower];
  const weight = position - lower;
  return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
}

export function summarize(values: number[]) {
  const sorted = [...values].sort((left, right) => left - right);
  const n = sorted.length;
  const avg = sorted.reduce((sum, value) => sum + value, 0) / n;
  const stdDev = n > 1 ? Math.sqrt(sorted.reduce((sum, value) => sum + (value - avg) ** 2, 0) / (n - 1)) : 0;

  return {
    n,
    mean: avg,
    median: percentile(sorted, 0.5),
    stdDev,
    min: sorted[0],
    max: sorted[n - 1],
    p90: percentile(sorted, 0.9),
    p95: percentile(sorted, 0.95),
    iqr: percentile(sorted, 0.75) - percentile(sorted, 0.25),
  };
}
