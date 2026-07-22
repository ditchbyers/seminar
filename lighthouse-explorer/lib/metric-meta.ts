/**
 * Canonical metric metadata for Lighthouse dashboard charts and tables.
 * Each entry defines label, unit, direction, display scale, thresholds, and axis labels.
 */
type Thresholds = { good: number; needs: number };

type MetricMetaEntry = {
  label: string;
  axisLabel: string;
  unit: string;
  scale: number;
  lowerIsBetter: boolean;
  digits: number;
  thresholds?: Thresholds;
  description?: string;
};

export const METRIC_META = {
  performanceScore: {
    label: 'Performance',
    axisLabel: 'Performance Score (%)',
    unit: '%',
    scale: 100,
    lowerIsBetter: false,
    digits: 1,
    thresholds: { good: 90, needs: 50 }, // good >= 90, needs >= 50, poor < 50
    description: 'Composite Lighthouse performance score [0–100]. Higher is better.',
  },
  firstContentfulPaintMs: {
    label: 'FCP',
    axisLabel: 'First Contentful Paint (ms)',
    unit: 'ms',
    scale: 1,
    lowerIsBetter: true,
    digits: 0,
    thresholds: { good: 1800, needs: 3000 },
    description: 'Time until the browser renders the first text or image. Lower is better.',
  },
  largestContentfulPaintMs: {
    label: 'LCP',
    axisLabel: 'Largest Contentful Paint (ms)',
    unit: 'ms',
    scale: 1,
    lowerIsBetter: true,
    digits: 0,
    thresholds: { good: 2500, needs: 4000 },
    description: 'Time until the largest visible content element is rendered. Lower is better.',
  },
  totalBlockingTimeMs: {
    label: 'TBT',
    axisLabel: 'Total Blocking Time (ms)',
    unit: 'ms',
    scale: 1,
    lowerIsBetter: true,
    digits: 0,
    thresholds: { good: 200, needs: 600 },
    description: 'Main-thread blocking time between FCP and TTI. Lower is better.',
  },
  speedIndexMs: {
    label: 'Speed Index',
    axisLabel: 'Speed Index (ms)',
    unit: 'ms',
    scale: 1,
    lowerIsBetter: true,
    digits: 0,
    thresholds: { good: 3400, needs: 5800 },
    description: 'Visual progress metric – how quickly the page is visually populated. Lower is better.',
  },
  cumulativeLayoutShift: {
    label: 'CLS',
    axisLabel: 'Cumulative Layout Shift',
    unit: '',
    scale: 1,
    lowerIsBetter: true,
    digits: 3,
    thresholds: { good: 0.1, needs: 0.25 },
    description: 'Unitless layout stability score. Lower is better.',
  },
  mainThreadWorkMs: {
    label: 'Main Thread Work',
    axisLabel: 'Main Thread Work (ms)',
    unit: 'ms',
    scale: 1,
    lowerIsBetter: true,
    digits: 0,
    description: 'Total time spent on main thread work. Lower is better.',
  },
  totalByteWeight: {
    label: 'Transfer Size',
    axisLabel: 'Transfer Size (KB)',
    unit: 'KB',
    scale: 1 / 1024,
    lowerIsBetter: true,
    digits: 0,
    description: 'Total page transfer weight in KB. Lower is better.',
  },
  categoryPerformance: {
    label: 'Performance Score',
    axisLabel: 'Performance Category Score (%)',
    unit: '%',
    scale: 100,
    lowerIsBetter: false,
    digits: 1,
    thresholds: { good: 90, needs: 50 },
  },
  categoryAccessibility: {
    label: 'Accessibility',
    axisLabel: 'Accessibility Score (%)',
    unit: '%',
    scale: 100,
    lowerIsBetter: false,
    digits: 1,
    thresholds: { good: 90, needs: 50 },
    description: 'Lighthouse accessibility audit score [0–100]. Higher is better.',
  },
  categoryBestPractices: {
    label: 'Best Practices',
    axisLabel: 'Best Practices Score (%)',
    unit: '%',
    scale: 100,
    lowerIsBetter: false,
    digits: 1,
    thresholds: { good: 90, needs: 50 },
    description: 'Lighthouse best practices audit score [0–100]. Higher is better.',
  },
  categorySeo: {
    label: 'SEO',
    axisLabel: 'SEO Score (%)',
    unit: '%',
    scale: 100,
    lowerIsBetter: false,
    digits: 1,
    thresholds: { good: 90, needs: 50 },
    description: 'Lighthouse SEO audit score [0–100]. Higher is better.',
  },
  failedAudits: {
    label: 'Failed Audits',
    axisLabel: 'Failed Audits (count)',
    unit: '',
    scale: 1,
    lowerIsBetter: true,
    digits: 0,
    description: 'Count of scored audits that did not pass. Lower is better.',
  },
  insightAuditCount: {
    label: 'Insight Audits',
    axisLabel: 'Insight Audits (count)',
    unit: '',
    scale: 1,
    lowerIsBetter: false,
    digits: 0,
    description: 'Count of insight-oriented audits in the report.',
  },
  diagnosticsItemCount: {
    label: 'Diagnostics Items',
    axisLabel: 'Diagnostics Items (count)',
    unit: '',
    scale: 1,
    lowerIsBetter: true,
    digits: 0,
    description: 'Count of diagnostics detail items in the Lighthouse JSON.',
  },
} as const satisfies Record<string, MetricMetaEntry>;

/** Ordered list of primary explorer metrics. */
export const PRIMARY_METRICS = [
  'performanceScore',
  'firstContentfulPaintMs',
  'largestContentfulPaintMs',
  'totalBlockingTimeMs',
  'speedIndexMs',
  'cumulativeLayoutShift',
  'categoryAccessibility',
  'categoryBestPractices',
  'categorySeo',
  'failedAudits',
  'insightAuditCount',
  'diagnosticsItemCount',
];

/** Format a raw value for a given metric key. */
export function formatMetricValue(key: string, rawValue: unknown): string {
  const meta = METRIC_META[key];
  if (!meta) return rawValue != null ? String(rawValue) : 'n/a';
  const value = Number(rawValue) * meta.scale;
  if (!Number.isFinite(value)) return 'n/a';
  return `${value.toFixed(meta.digits)}${meta.unit}`;
}

/** Return display-scaled value (number) for a metric, NaN if invalid. */
export function scaleMetricValue(key: string, rawValue: unknown): number {
  const meta = METRIC_META[key];
  if (!meta) return Number(rawValue);
  return Number(rawValue) * meta.scale;
}
