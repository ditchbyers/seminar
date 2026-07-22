import { promises as fs } from 'fs';
import { existsSync } from 'fs';
import path from 'path';
import { JMeterDataset, JMeterFileMeta, JMeterSummaryRow } from './types';

const RESULTS_ROOT_CANDIDATES = [
  path.resolve(__dirname, '..', 'results', 'jmeter'),
  path.resolve(__dirname, '..', '..', 'results', 'jmeter'),
  path.resolve(process.cwd(), 'results', 'jmeter'),
];

const RESULTS_ROOT = RESULTS_ROOT_CANDIDATES.find((candidate) => existsSync(candidate))
  ?? RESULTS_ROOT_CANDIDATES[0];

const NUMERIC_HEADERS = new Set([
  'timeStamp',
  'elapsed',
  'bytes',
  'sentBytes',
  'grpThreads',
  'allThreads',
  'Latency',
  'IdleTime',
  'Connect',
]);

type JMeterSample = {
  fileName: string;
  users: number;
  timeStamp: number;
  label: string;
  responseCode: string;
  responseMessage: string;
  threadName: string;
  dataType: string;
  success: boolean;
  failureMessage: string;
  elapsed: number;
  bytes: number;
  sentBytes: number;
  grpThreads: number;
  allThreads: number;
  url: string;
  latency: number;
  idleTime: number;
  connect: number;
  series: string;
  framework: string;
  version: string;
};

let datasetCache: { key: string; data: JMeterDataset } | null = null;

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

function toBoolean(value: unknown): boolean {
  return String(value).toLowerCase() === 'true';
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

function summarize(values: number[]) {
  const sorted = [...values].sort((left, right) => left - right);
  const n = sorted.length;
  const mean = n ? sorted.reduce((sum, value) => sum + value, 0) / n : Number.NaN;

  return {
    n,
    mean,
    median: percentile(sorted, 0.5),
    p95: percentile(sorted, 0.95),
    max: sorted.at(-1) ?? Number.NaN,
  };
}

function detectUsers(fileName: string): number {
  const match = fileName.match(/^(\d+)-users\.csv$/i);
  return match ? Number(match[1]) : Number.NaN;
}

function parseSeries(threadName: string): { series: string; framework: string; version: string } {
  const cleaned = threadName.replace(/\s+\d+-\d+$/, '').trim();
  const separatorIndex = cleaned.lastIndexOf(' ');
  if (separatorIndex < 0) {
    return { series: cleaned, framework: cleaned, version: '' };
  }

  return {
    series: cleaned,
    framework: cleaned.slice(0, separatorIndex),
    version: cleaned.slice(separatorIndex + 1),
  };
}

function aggregateSamples(fileName: string, samples: JMeterSample[]): { rows: JMeterSummaryRow[]; meta: JMeterFileMeta } {
  const grouped = new Map<string, JMeterSample[]>();
  for (const sample of samples) {
    if (!sample.series || !sample.framework || !sample.version) {
      continue;
    }
    const current = grouped.get(sample.series) ?? [];
    current.push(sample);
    grouped.set(sample.series, current);
  }

  const rows: JMeterSummaryRow[] = [];
  for (const [series, groupedSamples] of grouped.entries()) {
    const elapsedValues = groupedSamples.map((sample) => sample.elapsed).filter(Number.isFinite);
    const latencyValues = groupedSamples.map((sample) => sample.latency).filter(Number.isFinite);
    const connectValues = groupedSamples.map((sample) => sample.connect).filter(Number.isFinite);
    const successCount = groupedSamples.filter((sample) => sample.success).length;
    const failureCount = groupedSamples.length - successCount;
    const first = groupedSamples[0];
    const elapsedStats = summarize(elapsedValues);
    const latencyStats = summarize(latencyValues);
    const connectStats = summarize(connectValues);

    rows.push({
      fileName,
      users: first.users,
      series,
      framework: first.framework,
      version: first.version,
      sampleCount: groupedSamples.length,
      successCount,
      failureCount,
      successRatePct: groupedSamples.length ? (successCount / groupedSamples.length) * 100 : 0,
      avgElapsedMs: elapsedStats.mean,
      p50ElapsedMs: elapsedStats.median,
      p95ElapsedMs: elapsedStats.p95,
      maxElapsedMs: elapsedStats.max,
      avgLatencyMs: latencyStats.mean,
      p95LatencyMs: latencyStats.p95,
      avgConnectMs: connectStats.mean,
    });
  }

  rows.sort((left, right) =>
    left.users - right.users || left.series.localeCompare(right.series)
  );

  const frameworks = [...new Set(samples.map((sample) => sample.framework))].sort();
  const versions = [...new Set(samples.map((sample) => sample.version))].sort();
  const series = [...new Set(samples.map((sample) => sample.series))].sort();
  const successCount = samples.filter((sample) => sample.success).length;
  const failureCount = samples.length - successCount;
  const elapsedStats = summarize(samples.map((sample) => sample.elapsed).filter(Number.isFinite));
  const latencyStats = summarize(samples.map((sample) => sample.latency).filter(Number.isFinite));
  const timestamps = samples.map((sample) => sample.timeStamp).filter(Number.isFinite).sort((left, right) => left - right);
  const durationSeconds = timestamps.length > 1 ? (timestamps.at(-1)! - timestamps[0]) / 1000 : 0;

  return {
    rows,
    meta: {
      fileName,
      users: firstUsers(samples),
      rowCount: samples.length,
      seriesCount: series.length,
      frameworks,
      versions,
      series,
      successCount,
      failureCount,
      successRatePct: samples.length ? (successCount / samples.length) * 100 : 0,
      avgElapsedMs: elapsedStats.mean,
      p95ElapsedMs: elapsedStats.p95,
      avgLatencyMs: latencyStats.mean,
      p95LatencyMs: latencyStats.p95,
      durationSeconds,
    },
  };
}

function firstUsers(samples: JMeterSample[]): number {
  return samples[0]?.users ?? Number.NaN;
}

async function readRunFile(filePath: string): Promise<JMeterSample[]> {
  const csvText = await fs.readFile(filePath, 'utf8');
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length <= 1) {
    return [];
  }

  const fileName = path.basename(filePath);
  const users = detectUsers(fileName);
  const headers = parseCsvLine(lines[0]);
  const samples = lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const record: Record<string, string | number | boolean> = {};

    headers.forEach((header, index) => {
      const rawValue = values[index] ?? '';
      if (header === 'success') {
        record[header] = toBoolean(rawValue);
      } else if (NUMERIC_HEADERS.has(header)) {
        record[header] = toNumber(rawValue);
      } else {
        record[header] = rawValue;
      }
    });

    const threadName = String(record.threadName ?? '');
    const { series, framework, version } = parseSeries(threadName);

    if (!series || !framework || !version) {
      return null;
    }

    return {
      fileName,
      users,
      timeStamp: toNumber(record.timeStamp),
      label: String(record.label ?? ''),
      responseCode: String(record.responseCode ?? ''),
      responseMessage: String(record.responseMessage ?? ''),
      threadName,
      dataType: String(record.dataType ?? ''),
      success: Boolean(record.success),
      failureMessage: String(record.failureMessage ?? ''),
      elapsed: toNumber(record.elapsed),
      bytes: toNumber(record.bytes),
      sentBytes: toNumber(record.sentBytes),
      grpThreads: toNumber(record.grpThreads),
      allThreads: toNumber(record.allThreads),
      url: String(record.URL ?? ''),
      latency: toNumber(record.Latency),
      idleTime: toNumber(record.IdleTime),
      connect: toNumber(record.Connect),
      series,
      framework,
      version,
    } satisfies JMeterSample;
  }).filter((sample): sample is JMeterSample => Boolean(sample));

  return samples;
}

async function cacheKey(): Promise<string> {
  try {
    const entries = await fs.readdir(RESULTS_ROOT, { withFileTypes: true });
    const csvFiles = entries
      .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.csv'))
      .map((entry) => entry.name)
      .sort();

    const stats = await Promise.all(
      csvFiles.map(async (fileName) => {
        const filePath = path.join(RESULTS_ROOT, fileName);
        const stat = await fs.stat(filePath);
        return `${fileName}:${stat.size}:${stat.mtimeMs}`;
      })
    );

    return stats.join('|');
  } catch {
    return '';
  }
}

export function getResultsRoot(): string {
  return RESULTS_ROOT;
}

export async function loadJMeterDataset(): Promise<JMeterDataset> {
  const key = await cacheKey();
  if (datasetCache && datasetCache.key === key) {
    return datasetCache.data;
  }

  const entries = await fs.readdir(RESULTS_ROOT, { withFileTypes: true });
  const csvFiles = entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.csv'))
    .map((entry) => entry.name)
    .sort((left, right) => detectUsers(left) - detectUsers(right) || left.localeCompare(right));

  const files: JMeterFileMeta[] = [];
  const rows: JMeterSummaryRow[] = [];

  for (const fileName of csvFiles) {
    const filePath = path.join(RESULTS_ROOT, fileName);
    const samples = await readRunFile(filePath);
    if (!samples.length) continue;

    const aggregated = aggregateSamples(fileName, samples);
    files.push(aggregated.meta);
    rows.push(...aggregated.rows);
  }

  const data: JMeterDataset = {
    files,
    rows,
    root: RESULTS_ROOT,
  };

  datasetCache = { key, data };
  return data;
}

export function filterJMeterRows(dataset: JMeterDataset, query: Record<string, unknown>): JMeterSummaryRow[] {
  const parseSet = (value: unknown): Set<string> => {
    if (typeof value !== 'string' || !value.trim()) return new Set();
    return new Set(value.split(',').map((item) => item.trim()).filter(Boolean));
  };

  const parseNumberSet = (value: unknown): Set<number> => {
    if (typeof value !== 'string' || !value.trim()) return new Set();
    return new Set(value.split(',').map((item) => Number(item.trim())).filter(Number.isFinite));
  };

  const files = parseSet(query.files);
  const series = parseSet(query.series);
  const frameworks = parseSet(query.frameworks);
  const versions = parseSet(query.versions);
  const users = parseNumberSet(query.users);

  return dataset.rows.filter((row) => {
    if (files.size && !files.has(row.fileName)) return false;
    if (series.size && !series.has(row.series)) return false;
    if (frameworks.size && !frameworks.has(row.framework)) return false;
    if (versions.size && !versions.has(row.version)) return false;
    if (users.size && !users.has(row.users)) return false;
    return true;
  });
}