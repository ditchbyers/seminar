export type SortDir = 'asc' | 'desc';

export type PaginationRequest = {
  limit: number;
  offset: number;
  search: string;
  sortBy: string;
  sortDir: SortDir;
};

export type PaginationResponse = {
  total: number;
  limit: number;
  offset: number;
};

export type LighthouseRow = {
  runId: string;
  runFolder: string;
  timestamp: string;
  framework: string;
  version: string;
  port: number;
  route: string;
  url: string;
  preset: string;
  iteration: number;
  performanceScore: number;
  firstContentfulPaintMs: number;
  largestContentfulPaintMs: number;
  cumulativeLayoutShift: number;
  totalBlockingTimeMs: number;
  speedIndexMs: number;
  interactiveMs: number;
  serverResponseTimeMs: number;
  jsonReportPath: string;
  htmlReportPath: string;
  csvReportPath: string;
  jsonReportRelativePath: string;
  htmlReportRelativePath: string;
  csvReportRelativePath: string;
  categoryPerformance: number;
  categoryAccessibility: number;
  categoryBestPractices: number;
  categorySeo: number;
  categoryAgenticBrowsing: number;
  auditTotalCount: number;
  passedAudits: number;
  failedAudits: number;
  notApplicableAudits: number;
  informativeAudits: number;
  manualAudits: number;
  insightAuditCount: number;
  diagnosticsItemCount: number;
  runWarningCount: number;
  lighthouseVersion: string;
  fetchTime: string;
  mainThreadWorkMs: number;
  totalByteWeight: number;
  resourceCount: number;
};

export type LighthouseRun = {
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

export type LighthouseDataset = {
  rows: LighthouseRow[];
  runs: LighthouseRun[];
  root: string;
  latestRunFolder: string;
};

export type LighthouseFilterState = {
  runFolders: string[];
  frameworks: string[];
  presets: string[];
  routes: string[];
  iterations: number[];
};

export type AuditOccurrence = {
  key: string;
  auditId: string;
  title: string;
  description: string;
  bucket: string;
  score: number | null;
  displayValue: string;
  numericValue: number | null;
  numericUnit: string;
  itemCount: number;
  savings: { fcpMs: number; lcpMs: number };
  runFolder: string;
  iteration: number;
  reportJson: string;
};
