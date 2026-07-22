import { promises as fs } from 'fs';
import { existsSync } from 'fs';
import path from 'path';
import { LighthouseDataset, LighthouseFilterState, LighthouseRow, LighthouseRun, AuditOccurrence } from './types';

const RESULTS_ROOT_CANDIDATES = [
  path.resolve(__dirname, '..', 'results', 'lighthouse'),
  path.resolve(__dirname, '..', '..', 'results', 'lighthouse'),
  path.resolve(process.cwd(), 'results', 'lighthouse'),
];

const RESULTS_ROOT = RESULTS_ROOT_CANDIDATES.find((candidate) => existsSync(candidate))
  ?? RESULTS_ROOT_CANDIDATES[0];
const NUMERIC_HEADERS = new Set([
  'port',
  'iteration',
  'performance_score',
  'first_contentful_paint_ms',
  'largest_contentful_paint_ms',
  'cumulative_layout_shift',
  'total_blocking_time_ms',
  'speed_index_ms',
  'interactive_ms',
  'server_response_time_ms',
]);

const jsonCache = new Map<string, any>();
let datasetCache: { key: string; data: LighthouseDataset } | null = null;

function frameworkKey(row: LighthouseRow): string {
  return `${row.framework}-${row.version}`;
}

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];

    if (character === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (character === ',' && !inQuotes) {
      values.push(current);
      current = '';
      continue;
    }

    current += character;
  }

  values.push(current);
  return values;
}

function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function percentile(sortedValues: number[], fraction: number): number {
  if (sortedValues.length === 0) return Number.NaN;
  if (sortedValues.length === 1) return sortedValues[0];

  const position = (sortedValues.length - 1) * fraction;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);

  if (lower === upper) return sortedValues[lower];

  const weight = position - lower;
  return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
}

function summarize(values: number[]) {
  const sorted = [...values].sort((left, right) => left - right);
  const n = sorted.length;
  const mean = sorted.reduce((sum, value) => sum + value, 0) / n;
  const stdDev = n > 1 ? Math.sqrt(sorted.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (n - 1)) : 0;

  return {
    n,
    mean,
    median: percentile(sorted, 0.5),
    stdDev,
    p90: percentile(sorted, 0.9),
    p95: percentile(sorted, 0.95),
    iqr: percentile(sorted, 0.75) - percentile(sorted, 0.25),
  };
}

function parseSummaryCsv(csvText: string): LighthouseRow[] {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length <= 1) return [];

  const headers = parseCsvLine(lines[0]);

  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const record: Record<string, string | number> = {};

    headers.forEach((header, index) => {
      const rawValue = values[index] ?? '';
      record[header] = NUMERIC_HEADERS.has(header) ? toNumber(rawValue) : rawValue;
    });

    return {
      runId: String(record.run_id ?? ''),
      runFolder: String(record.run_id ?? ''),
      timestamp: String(record.timestamp ?? ''),
      framework: String(record.framework ?? ''),
      version: String(record.version ?? ''),
      port: Number(record.port ?? Number.NaN),
      route: String(record.route ?? ''),
      url: String(record.url ?? ''),
      preset: String(record.preset ?? ''),
      iteration: Number(record.iteration ?? Number.NaN),
      performanceScore: Number(record.performance_score ?? Number.NaN),
      firstContentfulPaintMs: Number(record.first_contentful_paint_ms ?? Number.NaN),
      largestContentfulPaintMs: Number(record.largest_contentful_paint_ms ?? Number.NaN),
      cumulativeLayoutShift: Number(record.cumulative_layout_shift ?? Number.NaN),
      totalBlockingTimeMs: Number(record.total_blocking_time_ms ?? Number.NaN),
      speedIndexMs: Number(record.speed_index_ms ?? Number.NaN),
      interactiveMs: Number(record.interactive_ms ?? Number.NaN),
      serverResponseTimeMs: Number(record.server_response_time_ms ?? Number.NaN),
      jsonReportPath: String(record.json_report ?? ''),
      htmlReportPath: String(record.html_report ?? ''),
      csvReportPath: String(record.csv_report ?? ''),
      jsonReportRelativePath: '',
      htmlReportRelativePath: '',
      csvReportRelativePath: '',
      categoryPerformance: Number.NaN,
      categoryAccessibility: Number.NaN,
      categoryBestPractices: Number.NaN,
      categorySeo: Number.NaN,
      categoryAgenticBrowsing: Number.NaN,
      auditTotalCount: 0,
      passedAudits: 0,
      failedAudits: 0,
      notApplicableAudits: 0,
      informativeAudits: 0,
      manualAudits: 0,
      insightAuditCount: 0,
      diagnosticsItemCount: 0,
      runWarningCount: 0,
      lighthouseVersion: '',
      fetchTime: '',
      mainThreadWorkMs: Number.NaN,
      totalByteWeight: Number.NaN,
      resourceCount: 0,
    };
  });
}

function toRelativeArtifactPath(absolutePath: string): string {
  return path.relative(RESULTS_ROOT, absolutePath).replaceAll('\\', '/');
}

function normalizeAbsoluteArtifactPath(candidatePath: string): string {
  if (!candidatePath) return '';
  if (path.isAbsolute(candidatePath)) return candidatePath;
  return path.resolve(RESULTS_ROOT, candidatePath);
}

function scoreValue(categories: any, key: string): number {
  const category = categories?.[key];
  if (!category) return Number.NaN;
  const score = category.score;
  return Number.isFinite(score) ? score : Number.NaN;
}

function extractAuditStats(audits: Record<string, any>) {
  const values = Object.values(audits ?? {});
  let passed = 0;
  let failed = 0;
  let notApplicable = 0;
  let informative = 0;
  let manual = 0;
  let insights = 0;

  for (const audit of values as any[]) {
    const mode = audit?.scoreDisplayMode;
    const score = audit?.score;
    const id = String(audit?.id ?? '');

    if (id.endsWith('-insight')) insights += 1;

    if (mode === 'notApplicable') {
      notApplicable += 1;
      continue;
    }

    if (mode === 'informative') {
      informative += 1;
      continue;
    }

    if (mode === 'manual') {
      manual += 1;
      continue;
    }

    if (Number.isFinite(score)) {
      if (score >= 0.9) passed += 1;
      else failed += 1;
    }
  }

  return {
    auditTotalCount: values.length,
    passedAudits: passed,
    failedAudits: failed,
    notApplicableAudits: notApplicable,
    informativeAudits: informative,
    manualAudits: manual,
    insightAuditCount: insights,
  };
}

async function readJsonDetails(jsonPath: string): Promise<Partial<LighthouseRow>> {
  if (!jsonPath) {
    return {
      categoryPerformance: Number.NaN,
      categoryAccessibility: Number.NaN,
      categoryBestPractices: Number.NaN,
      categorySeo: Number.NaN,
      categoryAgenticBrowsing: Number.NaN,
      auditTotalCount: 0,
      passedAudits: 0,
      failedAudits: 0,
      notApplicableAudits: 0,
      informativeAudits: 0,
      manualAudits: 0,
      insightAuditCount: 0,
      diagnosticsItemCount: 0,
      runWarningCount: 0,
      lighthouseVersion: '',
      fetchTime: '',
      mainThreadWorkMs: Number.NaN,
      totalByteWeight: Number.NaN,
      resourceCount: 0,
    };
  }

  if (jsonCache.has(jsonPath)) {
    return jsonCache.get(jsonPath);
  }

  let parsed: any = null;

  try {
    const text = await fs.readFile(jsonPath, 'utf8');
    parsed = JSON.parse(text);
  } catch {
    const empty = await readJsonDetails('');
    jsonCache.set(jsonPath, empty);
    return empty;
  }

  const lhr = parsed?.lhr ?? parsed;
  const categories = lhr?.categories ?? {};
  const audits = lhr?.audits ?? {};
  const diagnosticsItems = audits?.diagnostics?.details?.items ?? [];
  const resourceItems = audits?.['resource-summary']?.details?.items ?? [];
  const resourceCount = Array.isArray(resourceItems)
    ? resourceItems.reduce((sum: number, item: any) => sum + (Number(item?.requestCount) || 0), 0)
    : 0;

  const details = {
    categoryPerformance: scoreValue(categories, 'performance'),
    categoryAccessibility: scoreValue(categories, 'accessibility'),
    categoryBestPractices: scoreValue(categories, 'best-practices'),
    categorySeo: scoreValue(categories, 'seo'),
    categoryAgenticBrowsing: scoreValue(categories, 'agentic-browsing'),
    diagnosticsItemCount: Array.isArray(diagnosticsItems) ? diagnosticsItems.length : 0,
    runWarningCount: Array.isArray(lhr?.runWarnings) ? lhr.runWarnings.length : 0,
    lighthouseVersion: String(lhr?.lighthouseVersion ?? ''),
    fetchTime: String(lhr?.fetchTime ?? ''),
    mainThreadWorkMs: toNumber(audits?.['mainthread-work-breakdown']?.numericValue),
    totalByteWeight: toNumber(audits?.['total-byte-weight']?.numericValue),
    resourceCount,
    ...extractAuditStats(audits),
  };

  jsonCache.set(jsonPath, details);
  return details;
}

async function readSummaryFile(summaryPath: string): Promise<LighthouseRow[]> {
  const csvText = await fs.readFile(summaryPath, 'utf8');
  const runFolder = path.basename(path.dirname(summaryPath));

  const rows = parseSummaryCsv(csvText).map((row) => {
    const jsonAbsolutePath = normalizeAbsoluteArtifactPath(row.jsonReportPath);
    const htmlAbsolutePath = normalizeAbsoluteArtifactPath(row.htmlReportPath);
    const csvAbsolutePath = normalizeAbsoluteArtifactPath(row.csvReportPath);

    return {
      ...row,
      runFolder,
      runId: row.runId || runFolder,
      jsonReportPath: jsonAbsolutePath,
      htmlReportPath: htmlAbsolutePath,
      csvReportPath: csvAbsolutePath,
      jsonReportRelativePath: jsonAbsolutePath ? toRelativeArtifactPath(jsonAbsolutePath) : '',
      htmlReportRelativePath: htmlAbsolutePath ? toRelativeArtifactPath(htmlAbsolutePath) : '',
      csvReportRelativePath: csvAbsolutePath ? toRelativeArtifactPath(csvAbsolutePath) : '',
    };
  });

  return Promise.all(
    rows.map(async (row) => {
      const details = await readJsonDetails(row.jsonReportPath);
      return {
        ...row,
        ...details,
        timestamp: String(details.fetchTime || row.timestamp),
      } as LighthouseRow;
    })
  );
}

async function readRuns(root: string): Promise<LighthouseRun[]> {
  const entries = await fs.readdir(root, { withFileTypes: true });
  const folders = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((left, right) => right.localeCompare(left));

  const runs: LighthouseRun[] = [];

  for (const runFolder of folders) {
    const summaryPath = path.join(root, runFolder, 'summary.csv');
    try {
      await fs.access(summaryPath);
      const rows = await readSummaryFile(summaryPath);
      const iterations = rows
        .map((row) => Number(row.iteration))
        .filter((value) => Number.isFinite(value))
        .sort((left, right) => left - right);
      const timestamps = rows
        .map((row) => Date.parse(row.timestamp))
        .filter((value) => Number.isFinite(value))
        .sort((left, right) => left - right);

      runs.push({
        runFolder,
        summaryPath,
        rowCount: rows.length,
        dateLabel: runFolder.slice(0, 10),
        frameworks: [...new Set(rows.map((row) => `${row.framework}-${row.version}`))].sort(),
        versions: [...new Set(rows.map((row) => row.version))].sort(),
        presets: [...new Set(rows.map((row) => row.preset))].sort(),
        routes: [...new Set(rows.map((row) => row.route))].sort(),
        iterationMin: iterations[0] ?? null,
        iterationMax: iterations[iterations.length - 1] ?? null,
        firstTimestamp: timestamps[0] ? new Date(timestamps[0]).toISOString() : '',
        lastTimestamp: timestamps[timestamps.length - 1] ? new Date(timestamps[timestamps.length - 1]).toISOString() : '',
      });
    } catch {
      continue;
    }
  }

  return runs;
}

async function cacheKey(): Promise<string> {
  try {
    const entries = await fs.readdir(RESULTS_ROOT, { withFileTypes: true });
    return entries.filter((e) => e.isDirectory()).map((e) => e.name).sort().join('|');
  } catch {
    return '';
  }
}

export function getResultsRoot(): string {
  return RESULTS_ROOT;
}

export function resolveArtifactAbsolute(relativePath: string): string {
  const absolutePath = path.resolve(RESULTS_ROOT, relativePath);
  const normalizedRoot = `${path.resolve(RESULTS_ROOT)}${path.sep}`;
  if (!absolutePath.startsWith(normalizedRoot)) {
    throw new Error('Invalid file path');
  }
  return absolutePath;
}

export async function loadLighthouseDataset(): Promise<LighthouseDataset> {
  const key = await cacheKey();
  if (datasetCache && datasetCache.key === key) {
    return datasetCache.data;
  }

  const runs = await readRuns(RESULTS_ROOT);
  const rows: LighthouseRow[] = [];

  for (const run of runs) {
    const runRows = await readSummaryFile(run.summaryPath);
    rows.push(...runRows);
  }

  const data: LighthouseDataset = {
    rows,
    runs,
    root: RESULTS_ROOT,
    latestRunFolder: runs[0]?.runFolder ?? '',
  };

  datasetCache = { key, data };
  return data;
}

export function buildFilterState(dataset: LighthouseDataset): LighthouseFilterState {
  return {
    runFolders: dataset.runs.map((run) => run.runFolder),
    frameworks: [...new Set(dataset.rows.map((row) => `${row.framework}-${row.version}`))].sort(),
    presets: [...new Set(dataset.rows.map((row) => row.preset))].sort(),
    routes: [...new Set(dataset.rows.map((row) => row.route))].sort(),
    iterations: [...new Set(dataset.rows.map((row) => row.iteration))].sort((left, right) => left - right),
  };
}

export function filterRows(dataset: LighthouseDataset, query: Record<string, unknown>): LighthouseRow[] {
  const parseSet = (value: unknown): Set<string> => {
    if (typeof value !== 'string' || !value.trim()) return new Set();
    return new Set(value.split(',').map((x) => x.trim()).filter(Boolean));
  };

  const runs = parseSet(query.runs);
  const frameworks = parseSet(query.frameworks);
  const presets = parseSet(query.presets);
  const routes = parseSet(query.routes);
  const iterMin = toNumber(query.iterMin);
  const iterMax = toNumber(query.iterMax);

  return dataset.rows.filter((row) => {
    if (runs.size && !runs.has(row.runFolder)) return false;
    if (frameworks.size && !frameworks.has(frameworkKey(row))) return false;
    if (presets.size && !presets.has(row.preset)) return false;
    if (routes.size && !routes.has(row.route)) return false;
    if (Number.isFinite(iterMin) && row.iteration < iterMin) return false;
    if (Number.isFinite(iterMax) && row.iteration > iterMax) return false;
    return true;
  });
}

export function mapFilteredRowsTable(rows: LighthouseRow[]) {
  return rows.map((r) => ({
    runFolderRaw: r.runFolder,
    run: r.runFolder,
    framework: frameworkKey(r),
    preset: r.preset,
    route: r.route,
    iteration: r.iteration,
    performance: r.performanceScore,
    fcp: r.firstContentfulPaintMs,
    lcp: r.largestContentfulPaintMs,
    tbt: r.totalBlockingTimeMs,
    cls: r.cumulativeLayoutShift,
    accessibility: r.categoryAccessibility,
    bestPractices: r.categoryBestPractices,
    seo: r.categorySeo,
    failedAudits: r.failedAudits,
    insightAudits: r.insightAuditCount,
    jsonPath: r.jsonReportRelativePath,
    htmlPath: r.htmlReportRelativePath,
    csvPath: r.csvReportRelativePath,
  }));
}

export function mapPlatformSummaryTable(rows: LighthouseRow[]) {
  const metrics = [
    { key: 'performanceScore', label: 'Performance score' },
    { key: 'firstContentfulPaintMs', label: 'FCP (ms)' },
    { key: 'largestContentfulPaintMs', label: 'LCP (ms)' },
    { key: 'totalBlockingTimeMs', label: 'TBT (ms)' },
    { key: 'speedIndexMs', label: 'Speed Index (ms)' },
    { key: 'interactiveMs', label: 'Interactive (ms)' },
    { key: 'serverResponseTimeMs', label: 'Server response (ms)' },
    { key: 'cumulativeLayoutShift', label: 'CLS' },
  ];

  const grouped = new Map<string, LighthouseRow[]>();
  for (const row of rows) {
    const key = `${frameworkKey(row)}|${row.route}|${row.preset}`;
    const collection = grouped.get(key) ?? [];
    collection.push(row);
    grouped.set(key, collection);
  }

  const tableRows: any[] = [];
  for (const [key, group] of grouped.entries()) {
    const [framework, route, preset] = key.split('|');
    for (const metric of metrics) {
      const values = group.map((r: any) => Number(r[metric.key])).filter(Number.isFinite);
      if (!values.length) continue;
      const s = summarize(values);
      tableRows.push({
        framework,
        route,
        preset,
        metric: metric.label,
        n: s.n,
        mean: s.mean,
        median: s.median,
        stdDev: s.stdDev,
        iqr: s.iqr,
        p90: s.p90,
        p95: s.p95,
      });
    }
  }

  return tableRows.sort((a, b) =>
    a.framework.localeCompare(b.framework) ||
    a.route.localeCompare(b.route) ||
    a.preset.localeCompare(b.preset) ||
    a.metric.localeCompare(b.metric)
  );
}

export function mapTrendRowsTable(rows: LighthouseRow[], metric = 'largestContentfulPaintMs') {
  return rows.map((r: any) => ({
    runFolderRaw: r.runFolder,
    run: r.runFolder,
    framework: frameworkKey(r),
    preset: r.preset,
    route: r.route,
    iteration: r.iteration,
    metricValue: Number(r[metric]),
    performance: r.performanceScore,
  }));
}

function scoreBucket(mode: string, score: number): string {
  if (mode === 'notApplicable') return 'notApplicable';
  if (mode === 'manual') return 'manual';
  if (mode === 'informative') return 'informative';
  if (mode === 'error') return 'error';
  if (Number.isFinite(score)) return score >= 0.9 ? 'passed' : 'failed';
  return 'unknown';
}

function toSavings(audit: any): { fcpMs: number; lcpMs: number } {
  const fcp = toNumber(audit?.metricSavings?.FCP);
  const lcp = toNumber(audit?.metricSavings?.LCP);
  return { fcpMs: Number.isFinite(fcp) ? fcp : 0, lcpMs: Number.isFinite(lcp) ? lcp : 0 };
}

const PERFORMANCE_ID_SIGNAL = /performance|contentful-paint|render-blocking|blocking-time|mainthread|server-response|speed-index|interactive|resource|image|script|css|cache|byte/;

export type AuditImpactTag = 'lcp' | 'fcp' | 'performance';
const LIGHTHOUSE_SCHEMA_VERSION = '2026-07-15';

/**
 * Classifies whether an audit is worth evaluating at all in this dashboard, and which
 * performance signal(s) it speaks to. Audits with no bearing on performance/LCP/FCP
 * (accessibility, SEO, best-practices, etc.) are never actionable and are filtered out
 * everywhere audits are aggregated — we only evaluate audits that can influence
 * performance, LCP, or FCP.
 */
function classifyAuditImpact(auditId: string, audit: any): { tags: AuditImpactTag[]; isActionable: boolean } {
  const mode = String(audit?.scoreDisplayMode ?? 'unknown');
  if (mode === 'notApplicable' || mode === 'manual') return { tags: [], isActionable: false };

  const score = toNumber(audit?.score);
  const savings = toSavings(audit);
  const hasSavingsBenefit = savings.fcpMs > 0 || savings.lcpMs > 0;
  const hasFailingSignal = Number.isFinite(score) && score < 0.9;

  const tags: AuditImpactTag[] = [];
  if (savings.fcpMs > 0) tags.push('fcp');
  if (savings.lcpMs > 0) tags.push('lcp');

  const normalizedId = String(auditId ?? '').toLowerCase();
  const numericValue = toNumber(audit?.numericValue);
  const numericUnit = String(audit?.numericUnit ?? '').toLowerCase();
  const hasPerformanceSignal = PERFORMANCE_ID_SIGNAL.test(normalizedId)
    || (Number.isFinite(numericValue) && (numericUnit.includes('ms') || numericUnit.includes('millisecond')));

  const isActionable = hasSavingsBenefit || (hasPerformanceSignal && hasFailingSignal) || hasPerformanceSignal;
  if (!tags.length && isActionable) tags.push('performance');

  return { tags, isActionable: tags.length > 0 };
}

function isActionablePerformanceAudit(auditId: string, audit: any): boolean {
  return classifyAuditImpact(auditId, audit).isActionable;
}

const rawReportCache = new Map<string, any>();
const MAX_RAW_REPORT_CACHE_ENTRIES = 400;

async function readReportFromPath(jsonPath: string): Promise<any> {
  if (!jsonPath) return null;

  if (rawReportCache.has(jsonPath)) {
    return rawReportCache.get(jsonPath);
  }

  try {
    const raw = await fs.readFile(jsonPath, 'utf8');
    const parsed = JSON.parse(raw);
    const lhr = parsed?.lhr ?? parsed;

    if (rawReportCache.size >= MAX_RAW_REPORT_CACHE_ENTRIES) {
      const oldestKey = rawReportCache.keys().next().value;
      if (oldestKey) rawReportCache.delete(oldestKey);
    }
    rawReportCache.set(jsonPath, lhr);
    return lhr;
  } catch {
    return null;
  }
}

/**
 * Runs `mapper` over `items` with at most `concurrency` in flight at once, instead of
 * awaiting one at a time. Report-file reads are I/O bound, so this turns an O(n) chain of
 * sequential disk reads + JSON.parse calls into a handful of parallel batches — the single
 * biggest lever for "this feels slow" on cold-cache requests spanning many runs.
 */
async function mapWithConcurrency<T, R>(items: T[], concurrency: number, mapper: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;

  async function worker() {
    for (;;) {
      const index = cursor;
      cursor += 1;
      if (index >= items.length) return;
      results[index] = await mapper(items[index], index);
    }
  }

  const workerCount = Math.min(concurrency, items.length) || 1;
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}

async function readReportsForRows(rows: LighthouseRow[]): Promise<any[]> {
  return mapWithConcurrency(rows, 16, (row) => readReportFromPath(row.jsonReportPath));
}

function workspaceCompleteness(rows: LighthouseRow[], reportsByRow: any[]) {
  const missing = rows
    .map((row, index) => ({ row, loaded: Boolean(reportsByRow[index]) }))
    .filter((entry) => !entry.loaded)
    .map((entry) => `${frameworkKey(entry.row)}|${entry.row.route}|${entry.row.preset}|iter:${entry.row.iteration}`);

  return {
    expectedReports: rows.length,
    loadedReports: rows.length - missing.length,
    missingReports: missing.length,
    missingReportKeys: missing.slice(0, 50),
  };
}

function regressionSignals(rows: LighthouseRow[]) {
  const grouped = new Map<string, LighthouseRow[]>();
  for (const row of rows) {
    const key = `${frameworkKey(row)}|${row.route}|${row.preset}`;
    const current = grouped.get(key) ?? [];
    current.push(row);
    grouped.set(key, current);
  }

  const summarized = [...grouped.entries()].map(([key, group]) => {
    const [framework, route, preset] = key.split('|');
    const perfValues = group.map((row) => Number(row.performanceScore)).filter(Number.isFinite);
    const lcpValues = group.map((row) => Number(row.largestContentfulPaintMs)).filter(Number.isFinite);
    const fcpValues = group.map((row) => Number(row.firstContentfulPaintMs)).filter(Number.isFinite);
    const perf = perfValues.length ? perfValues.reduce((sum, value) => sum + value, 0) / perfValues.length : Number.NaN;
    const lcp = lcpValues.length ? lcpValues.reduce((sum, value) => sum + value, 0) / lcpValues.length : Number.NaN;
    const fcp = fcpValues.length ? fcpValues.reduce((sum, value) => sum + value, 0) / fcpValues.length : Number.NaN;
    return { framework, route, preset, perf, lcp, fcp };
  });

  const byRoutePreset = new Map<string, any[]>();
  for (const row of summarized) {
    const key = `${row.route}|${row.preset}`;
    const current = byRoutePreset.get(key) ?? [];
    current.push(row);
    byRoutePreset.set(key, current);
  }
  const signals: Array<{
    framework: string;
    route: string;
    preset: string;
    metric: 'performanceScore' | 'largestContentfulPaintMs' | 'firstContentfulPaintMs';
    deltaAbs: number;
    deltaPct: number;
    baseline: number;
    observed: number;
  }> = [];

  for (const entries of byRoutePreset.values()) {
    const bestPerf = Math.max(...entries.map((entry: any) => entry.perf).filter(Number.isFinite));
    const bestLcp = Math.min(...entries.map((entry: any) => entry.lcp).filter(Number.isFinite));
    const bestFcp = Math.min(...entries.map((entry: any) => entry.fcp).filter(Number.isFinite));

    for (const entry of entries as any[]) {
      if (Number.isFinite(entry.perf) && Number.isFinite(bestPerf) && bestPerf > 0) {
        const delta = bestPerf - entry.perf;
        if (delta > 0.01) {
          signals.push({
            framework: entry.framework,
            route: entry.route,
            preset: entry.preset,
            metric: 'performanceScore',
            baseline: bestPerf,
            observed: entry.perf,
            deltaAbs: delta,
            deltaPct: (delta / bestPerf) * 100,
          });
        }
      }

      if (Number.isFinite(entry.lcp) && Number.isFinite(bestLcp) && bestLcp > 0) {
        const delta = entry.lcp - bestLcp;
        if (delta > 0) {
          signals.push({
            framework: entry.framework,
            route: entry.route,
            preset: entry.preset,
            metric: 'largestContentfulPaintMs',
            baseline: bestLcp,
            observed: entry.lcp,
            deltaAbs: delta,
            deltaPct: (delta / bestLcp) * 100,
          });
        }
      }

      if (Number.isFinite(entry.fcp) && Number.isFinite(bestFcp) && bestFcp > 0) {
        const delta = entry.fcp - bestFcp;
        if (delta > 0) {
          signals.push({
            framework: entry.framework,
            route: entry.route,
            preset: entry.preset,
            metric: 'firstContentfulPaintMs',
            baseline: bestFcp,
            observed: entry.fcp,
            deltaAbs: delta,
            deltaPct: (delta / bestFcp) * 100,
          });
        }
      }
    }
  }

  return signals
    .sort((a, b) => b.deltaPct - a.deltaPct)
    .slice(0, 20);
}

export async function runWorkspace(runFolder: string) {
  const dataset = await loadLighthouseDataset();
  const runRows = dataset.rows.filter((row) => row.runFolder === runFolder);

  if (!runRows.length) {
    return null;
  }

  const firstLhr = await readReportFromPath(runRows[0].jsonReportPath);
  const categoryAgg = new Map<string, { id: string; title: string; sum: number; count: number; min: number; max: number }>();
  const auditGroupById = new Map<string, any>();

  const reportsByRow = await readReportsForRows(runRows);
  const completeness = workspaceCompleteness(runRows, reportsByRow);

  for (let rowIndex = 0; rowIndex < runRows.length; rowIndex += 1) {
    const row = runRows[rowIndex];
    const lhr = reportsByRow[rowIndex];
    if (!lhr || typeof lhr !== 'object') continue;

    const categories = lhr.categories ?? {};
    for (const [categoryId, category] of Object.entries(categories)) {
      const score = toNumber((category as any)?.score);
      if (!Number.isFinite(score)) continue;
      if (!categoryAgg.has(categoryId)) {
        categoryAgg.set(categoryId, {
          id: String(categoryId),
          title: String((category as any)?.title ?? categoryId),
          sum: 0,
          count: 0,
          min: Number.POSITIVE_INFINITY,
          max: Number.NEGATIVE_INFINITY,
        });
      }
      const agg = categoryAgg.get(categoryId);
      if (!agg) continue;
      agg.sum += score;
      agg.count += 1;
      agg.min = Math.min(agg.min, score);
      agg.max = Math.max(agg.max, score);
    }

    if (!lhr.audits || typeof lhr.audits !== 'object') continue;
    for (const [auditId, audit] of Object.entries(lhr.audits)) {
      if (!isActionablePerformanceAudit(String(auditId), audit)) continue;

      const mode = String((audit as any)?.scoreDisplayMode ?? 'unknown');
      const bucket = scoreBucket(mode, Number((audit as any)?.score));
      const itemCount = Array.isArray((audit as any)?.details?.items) ? (audit as any).details.items.length : 0;
      const savings = toSavings(audit);
      const impact = classifyAuditImpact(String(auditId), audit);

      if (!auditGroupById.has(auditId)) {
        auditGroupById.set(auditId, {
          id: auditId,
          title: String((audit as any)?.title ?? auditId),
          mode,
          occurrences: 0,
          failures: 0,
          items: 0,
          avgScoreAcc: 0,
          avgScoreCount: 0,
          savingsFcp: 0,
          savingsLcp: 0,
          categoryRefs: 'n/a',
          impactTags: new Set<string>(),
        });
      }

      const current = auditGroupById.get(auditId);
      if (!current) continue;
      current.occurrences += 1;
      current.items += itemCount;
      if (bucket === 'failed' || bucket === 'error') current.failures += 1;
      for (const tag of impact.tags) current.impactTags.add(tag);

      const score = toNumber((audit as any)?.score);
      if (Number.isFinite(score)) {
        current.avgScoreAcc += score;
        current.avgScoreCount += 1;
      }

      current.savingsFcp += savings.fcpMs;
      current.savingsLcp += savings.lcpMs;
    }
  }

  const categoryStats = [...categoryAgg.values()].map((entry) => ({
    id: entry.id,
    title: entry.title,
    scoreAvg: entry.count ? entry.sum / entry.count : Number.NaN,
    scoreMin: entry.count ? entry.min : Number.NaN,
    scoreMax: entry.count ? entry.max : Number.NaN,
    category: entry.title,
    average: entry.count ? entry.sum / entry.count : Number.NaN,
    minimum: entry.count ? entry.min : Number.NaN,
    maximum: entry.count ? entry.max : Number.NaN,
  }));

  const contextRows = [
    { label: 'Lighthouse version', value: String(firstLhr?.lighthouseVersion ?? 'n/a') },
    { label: 'Fetch time', value: String(firstLhr?.fetchTime ?? 'n/a') },
    { label: 'Gather mode', value: String(firstLhr?.gatherMode ?? 'n/a') },
    { label: 'Requested URL', value: String(firstLhr?.requestedUrl ?? 'n/a') },
    { label: 'Final URL', value: String(firstLhr?.finalUrl ?? 'n/a') },
    { label: 'Form factor', value: String(firstLhr?.configSettings?.formFactor ?? 'n/a') },
    { label: 'Throttling method', value: String(firstLhr?.configSettings?.throttlingMethod ?? 'n/a') },
    { label: 'User agent', value: String(firstLhr?.userAgent ?? 'n/a') },
  ];

  const overviewRows = runRows.map((r) => ({
    framework: frameworkKey(r),
    route: r.route,
    preset: r.preset,
    iteration: r.iteration,
    performance: r.performanceScore,
    fcp: r.firstContentfulPaintMs,
    lcp: r.largestContentfulPaintMs,
    tbt: r.totalBlockingTimeMs,
    cls: r.cumulativeLayoutShift,
    warnings: r.runWarningCount,
    json: r.jsonReportRelativePath,
    html: r.htmlReportRelativePath,
    csv: r.csvReportRelativePath,
  }));

  const auditRows = [...auditGroupById.values()].map((a) => ({
    id: a.id,
    title: a.title,
    scoreDisplayMode: a.mode,
    mode: a.mode,
    categoryRefs: a.categoryRefs,
    occurrences: a.occurrences,
    failed: a.failures,
    failures: a.failures,
    itemsTotal: a.items,
    items: a.items,
    avgScore: a.avgScoreCount ? a.avgScoreAcc / a.avgScoreCount : Number.NaN,
    savingsFcpMs: a.savingsFcp,
    savingsLcpMs: a.savingsLcp,
    savingsFcp: a.savingsFcp,
    savingsLcp: a.savingsLcp,
    impactTags: [...(a.impactTags as Set<string>)].sort(),
    runFolder,
  }));

  const runContext = {
    lighthouseVersion: String(firstLhr?.lighthouseVersion ?? ''),
    fetchTime: String(firstLhr?.fetchTime ?? ''),
    gatherMode: String(firstLhr?.gatherMode ?? ''),
    requestedUrl: String(firstLhr?.requestedUrl ?? ''),
    finalUrl: String(firstLhr?.finalUrl ?? ''),
    benchmarkIndex: Number(firstLhr?.environment?.benchmarkIndex ?? Number.NaN),
    formFactor: String(firstLhr?.configSettings?.formFactor ?? ''),
    throttlingMethod: String(firstLhr?.configSettings?.throttlingMethod ?? ''),
    userAgent: String(firstLhr?.userAgent ?? ''),
    runWarnings: Array.isArray(firstLhr?.runWarnings) ? firstLhr.runWarnings : [],
  };

  const rows = runRows;
  const signals = regressionSignals(runRows);

  return {
    runFolder,
    rows,
    runContext,
    categoryStats,
    audits: auditRows,
    overviewRows,
    contextRows,
    categoryRows: categoryStats,
    auditRows,
    analysis: {
      schemaVersion: LIGHTHOUSE_SCHEMA_VERSION,
      generatedAt: new Date().toISOString(),
      completeness,
      topRegressionSignals: signals,
    },
  };
}

export async function allRunsAuditSummary() {
  const dataset = await loadLighthouseDataset();
  const auditGroupById = new Map<string, any>();

  const reportsByRow = await readReportsForRows(dataset.rows);
  const completeness = workspaceCompleteness(dataset.rows, reportsByRow);

  for (let rowIndex = 0; rowIndex < dataset.rows.length; rowIndex += 1) {
    const lhr = reportsByRow[rowIndex];
    if (!lhr?.audits || typeof lhr.audits !== 'object') continue;

    for (const [auditId, audit] of Object.entries(lhr.audits)) {
      if (!isActionablePerformanceAudit(String(auditId), audit)) continue;

      const mode = String((audit as any)?.scoreDisplayMode ?? 'unknown');
      const bucket = scoreBucket(mode, Number((audit as any)?.score));
      const itemCount = Array.isArray((audit as any)?.details?.items) ? (audit as any).details.items.length : 0;
      const savings = toSavings(audit);
      const impact = classifyAuditImpact(String(auditId), audit);

      if (!auditGroupById.has(auditId)) {
        auditGroupById.set(auditId, {
          id: auditId,
          title: String((audit as any)?.title ?? auditId),
          mode,
          occurrences: 0,
          failures: 0,
          items: 0,
          avgScoreAcc: 0,
          avgScoreCount: 0,
          savingsFcp: 0,
          savingsLcp: 0,
          categoryRefs: 'n/a',
          impactTags: new Set<string>(),
        });
      }

      const current = auditGroupById.get(auditId);
      if (!current) continue;
      current.occurrences += 1;
      current.items += itemCount;
      if (bucket === 'failed' || bucket === 'error') current.failures += 1;
      for (const tag of impact.tags) current.impactTags.add(tag);

      const score = toNumber((audit as any)?.score);
      if (Number.isFinite(score)) {
        current.avgScoreAcc += score;
        current.avgScoreCount += 1;
      }

      current.savingsFcp += savings.fcpMs;
      current.savingsLcp += savings.lcpMs;
    }
  }

  const auditRows = [...auditGroupById.values()].map((a) => ({
    id: a.id,
    title: a.title,
    scoreDisplayMode: a.mode,
    mode: a.mode,
    categoryRefs: a.categoryRefs,
    occurrences: a.occurrences,
    failed: a.failures,
    failures: a.failures,
    itemsTotal: a.items,
    items: a.items,
    avgScore: a.avgScoreCount ? a.avgScoreAcc / a.avgScoreCount : Number.NaN,
    savingsFcpMs: a.savingsFcp,
    savingsLcpMs: a.savingsLcp,
    savingsFcp: a.savingsFcp,
    savingsLcp: a.savingsLcp,
    impactTags: [...(a.impactTags as Set<string>)].sort(),
    runFolder: '__all__',
  }));

  return {
    runFolder: '__all__',
    audits: auditRows,
    auditRows,
    analysis: {
      schemaVersion: LIGHTHOUSE_SCHEMA_VERSION,
      generatedAt: new Date().toISOString(),
      completeness,
      topRegressionSignals: regressionSignals(dataset.rows),
    },
  };
}

export async function iterationRows(runFolder: string, iteration: number) {
  const dataset = await loadLighthouseDataset();
  return dataset.rows
    .filter((r) => r.runFolder === runFolder && r.iteration === iteration)
    .map((r) => ({
      framework: frameworkKey(r),
      route: r.route,
      preset: r.preset,
      iteration: r.iteration,
      score: r.performanceScore,
      fcp: r.firstContentfulPaintMs,
      lcp: r.largestContentfulPaintMs,
      tbt: r.totalBlockingTimeMs,
      cls: r.cumulativeLayoutShift,
      mainThread: r.mainThreadWorkMs,
      transfer: r.totalByteWeight,
    }));
}

export async function auditOccurrences(runFolder: string, auditId: string) {
  const dataset = await loadLighthouseDataset();
  const runRows = dataset.rows.filter((row) => row.runFolder === runFolder);
  if (!runRows.length) return [];

  const occurrences: any[] = [];

  const reportsByRow = await readReportsForRows(runRows);

  for (let rowIndex = 0; rowIndex < runRows.length; rowIndex += 1) {
    const row = runRows[rowIndex];
    const lhr = reportsByRow[rowIndex];
    const audit = lhr?.audits?.[auditId];
    if (!audit) continue;

    const details = audit?.details ?? null;
    const items = Array.isArray(details?.items) ? details.items : [];

    occurrences.push({
      key: `${frameworkKey(row)}|${row.preset}|${row.route}|${row.iteration}`,
      framework: frameworkKey(row),
      route: row.route,
      preset: row.preset,
      iteration: row.iteration,
      scoreMode: String(audit?.scoreDisplayMode ?? 'unknown'),
      score: toNumber(audit?.score),
      numericValue: toNumber(audit?.numericValue),
      displayValue: String(audit?.displayValue ?? ''),
      detailsType: String(audit?.details?.type ?? 'none'),
      itemCount: items.length,
      jsonLink: row.jsonReportRelativePath,
      timestamp: row.timestamp,
    });
  }

  return occurrences;
}

export async function auditDetail(runFolder: string, auditId: string) {
  const workspace = await runWorkspace(runFolder);
  if (!workspace) return null;

  const dataset = await loadLighthouseDataset();
  const runRows = dataset.rows.filter((row) => row.runFolder === runFolder);

  const occurrences: any[] = [];

  const reportsByRow = await readReportsForRows(runRows);

  for (let rowIndex = 0; rowIndex < runRows.length; rowIndex += 1) {
    const row = runRows[rowIndex];
    const lhr = reportsByRow[rowIndex];
    const audit = lhr?.audits?.[auditId];
    if (!audit) continue;

    const details = audit?.details ?? null;
    const headings = Array.isArray(details?.headings) ? details.headings : [];
    const items = Array.isArray(details?.items) ? details.items : [];

    occurrences.push({
      key: `${frameworkKey(row)}|${row.preset}|${row.route}|${row.iteration}`,
      framework: frameworkKey(row),
      route: row.route,
      preset: row.preset,
      iteration: row.iteration,
      timestamp: row.timestamp,
      scoreDisplayMode: String(audit?.scoreDisplayMode ?? 'unknown'),
      score: toNumber(audit?.score),
      numericValue: toNumber(audit?.numericValue),
      numericUnit: String(audit?.numericUnit ?? ''),
      displayValue: String(audit?.displayValue ?? ''),
      detailsType: String(audit?.details?.type ?? 'none'),
      itemCount: items.length,
      headings,
      items,
      audit,
      reportLinks: {
        json: row.jsonReportRelativePath,
        html: row.htmlReportRelativePath,
        csv: row.csvReportRelativePath,
      },
    });
  }

  const auditMeta = workspace.audits.find((entry: any) => entry.id === auditId) ?? null;

  return {
    ...workspace,
    auditId,
    auditMeta,
    occurrences,
  };
}

export async function auditDetailAllRuns(auditId: string) {
  const summary = await allRunsAuditSummary();
  const dataset = await loadLighthouseDataset();

  const occurrences: any[] = [];

  const reportsByRow = await readReportsForRows(dataset.rows);

  for (let rowIndex = 0; rowIndex < dataset.rows.length; rowIndex += 1) {
    const row = dataset.rows[rowIndex];
    const lhr = reportsByRow[rowIndex];
    const audit = lhr?.audits?.[auditId];
    if (!audit) continue;
    if (!isActionablePerformanceAudit(auditId, audit)) continue;

    const details = audit?.details ?? null;
    const headings = Array.isArray(details?.headings) ? details.headings : [];
    const items = Array.isArray(details?.items) ? details.items : [];

    occurrences.push({
      key: `${row.runFolder}|${frameworkKey(row)}|${row.preset}|${row.route}|${row.iteration}`,
      framework: frameworkKey(row),
      route: row.route,
      preset: row.preset,
      iteration: row.iteration,
      timestamp: row.timestamp,
      scoreDisplayMode: String(audit?.scoreDisplayMode ?? 'unknown'),
      score: toNumber(audit?.score),
      numericValue: toNumber(audit?.numericValue),
      numericUnit: String(audit?.numericUnit ?? ''),
      displayValue: String(audit?.displayValue ?? ''),
      detailsType: String(audit?.details?.type ?? 'none'),
      itemCount: items.length,
      headings,
      items,
      audit,
      reportLinks: {
        json: row.jsonReportRelativePath,
        html: row.htmlReportRelativePath,
        csv: row.csvReportRelativePath,
      },
    });
  }

  const auditMeta = summary.audits.find((entry: any) => entry.id === auditId) ?? null;

  return {
    runFolder: '__all__',
    rows: dataset.rows,
    runContext: {
      lighthouseVersion: '',
      fetchTime: '',
      gatherMode: '',
      requestedUrl: '',
      finalUrl: '',
      benchmarkIndex: Number.NaN,
      formFactor: '',
      throttlingMethod: '',
      userAgent: '',
      runWarnings: [],
    },
    categoryStats: [],
    audits: summary.audits,
    overviewRows: [],
    contextRows: [],
    categoryRows: [],
    auditRows: summary.auditRows,
    auditId,
    auditMeta,
    occurrences,
  };
}

export async function heatmapCellDetails(framework: string, preset: string, route: string): Promise<{ sampleCount: number; reportCount: number; occurrences: AuditOccurrence[] }> {
  const dataset = await loadLighthouseDataset();
  const matchingRows = dataset.rows.filter((row) => `${row.framework}-${row.version}` === framework && row.preset === preset && row.route === route);

  const occurrences: AuditOccurrence[] = [];
  let reportCount = 0;

  const reportsByRow = await readReportsForRows(matchingRows);

  for (let rowIndex = 0; rowIndex < matchingRows.length; rowIndex += 1) {
    const row = matchingRows[rowIndex];
    const lhr = reportsByRow[rowIndex];
    if (!lhr?.audits || typeof lhr.audits !== 'object') continue;
    reportCount += 1;

    for (const [auditId, audit] of Object.entries(lhr.audits)) {
      if (!isActionablePerformanceAudit(String(auditId), audit)) continue;

      const mode = String((audit as any)?.scoreDisplayMode ?? 'unknown');
      const score = toNumber((audit as any)?.score);
      const bucket = scoreBucket(mode, score);
      if (!['failed', 'informative', 'error', 'manual'].includes(bucket)) continue;
      const items = Array.isArray((audit as any)?.details?.items) ? (audit as any).details.items : [];
      occurrences.push({
        key: `${row.runFolder}|${auditId}|${row.iteration}`,
        auditId,
        title: String((audit as any)?.title ?? auditId),
        description: String((audit as any)?.description ?? ''),
        bucket,
        score: Number.isFinite(score) ? score : null,
        displayValue: String((audit as any)?.displayValue ?? ''),
        numericValue: Number.isFinite(toNumber((audit as any)?.numericValue)) ? toNumber((audit as any)?.numericValue) : null,
        numericUnit: String((audit as any)?.numericUnit ?? ''),
        itemCount: items.length,
        savings: toSavings(audit),
        runFolder: row.runFolder,
        iteration: row.iteration,
        reportJson: row.jsonReportRelativePath,
      });
    }
  }

  return {
    sampleCount: matchingRows.length,
    reportCount,
    occurrences,
  };
}
