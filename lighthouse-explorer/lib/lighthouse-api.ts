const API_BASE = process.env.LIGHTHOUSE_API_URL || process.env.NEXT_PUBLIC_LIGHTHOUSE_API_URL || 'http://localhost:3001';

type QueryValue = string | number | boolean | undefined | null;

export type LighthouseFilterState = {
  runFolders: string[];
  frameworks: string[];
  presets: string[];
  routes: string[];
  iterations: number[];
};

export type LighthouseRunMeta = {
  runFolder: string;
  summaryPath: string;
  rowCount: number;
  dateLabel: string;
  frameworks: string[];
  versions: string[];
  presets: string[];
  routes: string[];
  iterationMin: number | null;
  iterationMax: number | null;
  firstTimestamp: string;
  lastTimestamp: string;
};

export type LighthouseMetaResponse = {
  runs: LighthouseRunMeta[];
  filters: LighthouseFilterState;
  latestRunFolder: string;
  sourceRoot: string;
  contract?: {
    schemaVersion: string;
    generatedAt: string;
  };
  evaluationFocus?: {
    lighthouse: string;
    jmeter: string;
  };
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

export type JMeterMetaResponse = {
  files: JMeterFileMeta[];
  availableSeries: string[];
  sourceRoot: string;
  contract?: {
    schemaVersion: string;
    generatedAt: string;
  };
};

export type PaginatedResponse<T> = {
  data: T[];
  total: number;
  limit: number;
  offset: number;
};

export type GraphRowsResponse<T> = {
  data: T[];
  total: number;
  limit?: number;
  offset?: number;
  truncated?: boolean;
};

export type AnalysisCompleteness = {
  expectedReports: number;
  loadedReports: number;
  missingReports: number;
  missingReportKeys: string[];
};

export type RegressionSignal = {
  framework: string;
  route: string;
  preset: string;
  metric: 'performanceScore' | 'largestContentfulPaintMs' | 'firstContentfulPaintMs';
  deltaAbs: number;
  deltaPct: number;
  baseline: number;
  observed: number;
};

export type AnalysisMetadata = {
  schemaVersion: string;
  generatedAt: string;
  completeness: AnalysisCompleteness;
  topRegressionSignals: RegressionSignal[];
};

export type LighthouseRow = {
  runFolder: string;
  framework: string;
  version: string;
  preset: string;
  route: string;
  iteration: number;
  timestamp: string;
  performanceScore: number;
  firstContentfulPaintMs: number;
  largestContentfulPaintMs: number;
  totalBlockingTimeMs: number;
  cumulativeLayoutShift: number;
  categoryAccessibility: number;
  categoryBestPractices: number;
  categorySeo: number;
  failedAudits: number;
  insightAuditCount: number;
  runWarningCount: number;
  mainThreadWorkMs: number;
  totalByteWeight: number;
  jsonReportRelativePath: string;
  htmlReportRelativePath: string;
  csvReportRelativePath: string;
  [key: string]: unknown;
};

export type RunsTableRow = {
  runFolder: string;
  dateLabel: string;
  rowCount: number;
  frameworkCount: number;
  frameworks: string;
  presets: string;
  routeCount: number;
  iterationRange: string;
  firstTimestamp: string;
  lastTimestamp: string;
};

export type RunContext = {
  lighthouseVersion: string;
  fetchTime: string;
  gatherMode: string;
  requestedUrl: string;
  finalUrl: string;
  benchmarkIndex: number;
  formFactor: string;
  throttlingMethod: string;
  userAgent: string;
  runWarnings: unknown[];
};

export type CategoryStat = {
  id: string;
  title: string;
  scoreAvg: number;
  scoreMin: number;
  scoreMax: number;
};

export type AuditIndexEntry = {
  id: string;
  title: string;
  scoreDisplayMode: string;
  mode: string;
  categoryRefs: string;
  occurrences: number;
  failed: number;
  failures: number;
  itemsTotal: number;
  items: number;
  avgScore: number;
  savingsFcpMs: number;
  savingsLcpMs: number;
  savingsFcp: number;
  savingsLcp: number;
  /** Which performance signal(s) this audit speaks to: only audits with at least one tag are ever surfaced. */
  impactTags: Array<'lcp' | 'fcp' | 'performance'>;
  runFolder: string;
};

export type RunWorkspaceResponse = {
  runFolder: string;
  rows: LighthouseRow[];
  runContext: RunContext;
  categoryStats: CategoryStat[];
  audits: AuditIndexEntry[];
  overviewRows: Array<Record<string, unknown>>;
  contextRows: Array<Record<string, unknown>>;
  categoryRows: Array<Record<string, unknown>>;
  auditRows: Array<Record<string, unknown>>;
  analysis?: AnalysisMetadata;
};

export type AllRunsAuditSummaryResponse = {
  runFolder: string;
  audits: AuditIndexEntry[];
  auditRows: Array<Record<string, unknown>>;
  analysis?: AnalysisMetadata;
};

export type RunIterationResponse = {
  runFolder: string;
  iteration: number;
  rows: LighthouseRow[];
};

export type AuditHeading = {
  key: string;
  label?: string;
};

export type AuditOccurrenceDetail = {
  key: string;
  framework: string;
  route: string;
  preset: string;
  iteration: number;
  timestamp: string;
  scoreDisplayMode: string;
  score: number;
  numericValue: number;
  numericUnit: string;
  displayValue: string;
  detailsType: string;
  itemCount: number;
  headings: AuditHeading[];
  items: Array<Record<string, unknown>>;
  audit: Record<string, unknown>;
  reportLinks: {
    json: string;
    html: string;
    csv: string;
  };
};

export type AuditDetailResponse = RunWorkspaceResponse & {
  auditId: string;
  auditMeta: AuditIndexEntry | null;
  occurrences: AuditOccurrenceDetail[];
};

function toQuery(params: Record<string, QueryValue>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    search.set(key, String(value));
  }
  return search.toString();
}

async function fetchJson<T>(endpoint: string, params: Record<string, QueryValue> = {}): Promise<T> {
  const query = toQuery(params);
  const url = `${API_BASE}${endpoint}${query ? `?${query}` : ''}`;
  const response = await fetch(url, { cache: 'no-store' });

  if (!response.ok) {
    let details = '';
    try {
      const body = await response.text();
      if (body.trim()) details = `: ${body.trim()}`;
    } catch {
      details = '';
    }
    throw new Error(`Request failed (${response.status}) for ${endpoint}${details}`);
  }

  return (await response.json()) as T;
}

export function apiBaseUrl(): string {
  return API_BASE;
}

export function artifactUrl(file: string, disposition: 'inline' | 'attachment' = 'inline'): string {
  const query = new URLSearchParams({ file, disposition });
  return `${API_BASE}/api/lighthouse/artifact?${query.toString()}`;
}

export async function fetchLighthouseMeta(): Promise<LighthouseMetaResponse> {
  return fetchJson<LighthouseMetaResponse>('/api/lighthouse/meta');
}

export async function fetchFilteredRowsAll(params: Record<string, QueryValue> = {}): Promise<PaginatedResponse<LighthouseRow>> {
  return fetchJson<PaginatedResponse<LighthouseRow>>('/api/lighthouse/table/filtered-rows', { ...params, limit: 50000, offset: 0 });
}

export async function fetchGraphRowsAll(params: Record<string, QueryValue> = {}): Promise<GraphRowsResponse<LighthouseRow>> {
  return fetchJson<GraphRowsResponse<LighthouseRow>>('/api/lighthouse/graph/rows', {
    limit: 20000,
    offset: 0,
    ...params,
  });
}

export async function fetchRunsTableAll(): Promise<PaginatedResponse<RunsTableRow>> {
  return fetchJson<PaginatedResponse<RunsTableRow>>('/api/lighthouse/table/runs', { limit: 5000, offset: 0, sortBy: 'runFolder', sortDir: 'desc' });
}

export async function fetchJMeterMeta(): Promise<JMeterMetaResponse> {
  return fetchJson<JMeterMetaResponse>('/api/jmeter/meta');
}

export async function fetchJMeterSummaryRowsAll(params: Record<string, QueryValue> = {}): Promise<PaginatedResponse<JMeterSummaryRow>> {
  return fetchJson<PaginatedResponse<JMeterSummaryRow>>('/api/jmeter/table/summary', { ...params, limit: 50000, offset: 0 });
}

export async function searchFilteredRows(params: Record<string, QueryValue>): Promise<PaginatedResponse<LighthouseRow>> {
  return fetchJson<PaginatedResponse<LighthouseRow>>('/api/lighthouse/search/filtered-rows', params);
}

export async function searchTrendRows(params: Record<string, QueryValue>): Promise<PaginatedResponse<Record<string, unknown>>> {
  return fetchJson<PaginatedResponse<Record<string, unknown>>>('/api/lighthouse/search/trend-rows', params);
}

export async function searchPlatformSummaryRows(params: Record<string, QueryValue>): Promise<PaginatedResponse<Record<string, unknown>>> {
  return fetchJson<PaginatedResponse<Record<string, unknown>>>('/api/lighthouse/search/platform-summary', params);
}

export async function searchRunRows(params: Record<string, QueryValue>): Promise<PaginatedResponse<RunsTableRow>> {
  return fetchJson<PaginatedResponse<RunsTableRow>>('/api/lighthouse/search/runs', params);
}

export async function fetchRunWorkspace(runFolder: string): Promise<RunWorkspaceResponse> {
  return fetchJson<RunWorkspaceResponse>(`/api/lighthouse/run/${encodeURIComponent(runFolder)}`);
}

export async function fetchRunIteration(runFolder: string, iteration: number): Promise<RunIterationResponse> {
  return fetchJson<RunIterationResponse>(`/api/lighthouse/run/${encodeURIComponent(runFolder)}/iteration/${iteration}`);
}

export async function fetchAuditDetail(runFolder: string, auditId: string): Promise<AuditDetailResponse> {
  return fetchJson<AuditDetailResponse>(`/api/lighthouse/run/${encodeURIComponent(runFolder)}/audit/${encodeURIComponent(auditId)}`);
}

export async function fetchAllRunsAuditSummary(): Promise<AllRunsAuditSummaryResponse> {
  return fetchJson<AllRunsAuditSummaryResponse>('/api/lighthouse/audits/summary');
}

export async function fetchAuditDetailAllRuns(auditId: string): Promise<AuditDetailResponse> {
  return fetchJson<AuditDetailResponse>(`/api/lighthouse/audit/${encodeURIComponent(auditId)}`);
}
