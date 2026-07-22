export type JMeterSummaryRow = {
  fileName: string;
  users: number;
  series: string;
  framework: string;
  version: string;
  sampleCount: number;
  successCount: number;
  failureCount: number;
  successRatePct: number;
  avgElapsedMs: number;
  p50ElapsedMs: number;
  p95ElapsedMs: number;
  maxElapsedMs: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  avgConnectMs: number;
};

export type JMeterFileMeta = {
  fileName: string;
  users: number;
  rowCount: number;
  seriesCount: number;
  frameworks: string[];
  versions: string[];
  series: string[];
  successCount: number;
  failureCount: number;
  successRatePct: number;
  avgElapsedMs: number;
  p95ElapsedMs: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  durationSeconds: number;
};

export type JMeterDataset = {
  rows: JMeterSummaryRow[];
  files: JMeterFileMeta[];
  root: string;
};