import 'dotenv/config';

import { promises as fs } from 'fs';
import path from 'path';
import express, { Request, Response } from 'express';
import cors from 'cors';
import { getDb } from './db';
import { seedHotelReviews, seedHotelReviewsDataset } from './seed';
import { paginateRows, parsePaginationQuery } from './lighthouse/pagination';
import {
  allRunsAuditSummary,
  auditDetailAllRuns,
  auditDetail,
  auditOccurrences,
  buildFilterState,
  filterRows,
  getResultsRoot,
  heatmapCellDetails,
  iterationRows,
  loadLighthouseDataset,
  mapPlatformSummaryTable,
  mapTrendRowsTable,
  resolveArtifactAbsolute,
  runWorkspace,
} from './lighthouse/service';
import { filterJMeterRows, loadJMeterDataset } from './jmeter/service';

const app = express();
const PORT = Number(process.env.PORT || 3001);

const VALID_TABLES = ['hotel_reviews', 'hotel_reviews_dataset'] as const;

type ReviewTable = (typeof VALID_TABLES)[number];

type EndpointCacheEntry = {
  value: unknown;
  expiresAt: number;
  refreshing: boolean;
};

const API_CACHE_TTL_MS = 5 * 60 * 1000;
const endpointCache = new Map<string, EndpointCacheEntry>();
const MAX_ENDPOINT_CACHE_ENTRIES = 120;
const API_SCHEMA_VERSION = '2026-07-15';
const DEFAULT_GRAPH_LIMIT = 5000;
const MAX_GRAPH_LIMIT = 20000;
// Every endpoint is safe to cache: the cache key already includes the full request URL
// (scope + query string), so distinct parameter combinations never collide, and the
// stale-while-revalidate strategy in getCachedValue() keeps data fresh in the background.
// These were previously excluded, forcing every request to re-read + re-parse every
// matching Lighthouse JSON report from disk — the most expensive endpoints in the API.
const NON_CACHEABLE_SCOPES = new Set<string>([]);

function endpointCacheKey(req: Request, scope: string): string {
  return `${scope}:${req.originalUrl}`;
}

function parseBoundedInt(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  const rounded = Math.floor(parsed);
  return Math.min(max, Math.max(min, rounded));
}

function graphWindow<T>(rows: T[], query: Record<string, unknown>) {
  const limit = parseBoundedInt(query.limit, DEFAULT_GRAPH_LIMIT, 1, MAX_GRAPH_LIMIT);
  const offset = parseBoundedInt(query.offset, 0, 0, Number.MAX_SAFE_INTEGER);
  const data = rows.slice(offset, offset + limit);
  return {
    data,
    total: rows.length,
    limit,
    offset,
    truncated: offset + data.length < rows.length,
  };
}

function contractMetadata() {
  return {
    schemaVersion: API_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
  };
}

async function getCachedValue<T>(req: Request, scope: string, producer: () => Promise<T>): Promise<T> {
  if (NON_CACHEABLE_SCOPES.has(scope)) {
    return producer();
  }

  const key = endpointCacheKey(req, scope);
  const now = Date.now();

  // Opportunistically purge expired entries to avoid unbounded cache growth.
  for (const [entryKey, entryValue] of endpointCache.entries()) {
    if (entryValue.expiresAt <= now && !entryValue.refreshing) {
      endpointCache.delete(entryKey);
    }
  }

  const existing = endpointCache.get(key);

  if (existing) {
    if (now < existing.expiresAt) {
      return existing.value as T;
    }

    if (!existing.refreshing) {
      existing.refreshing = true;
      void producer()
        .then((nextValue) => {
          endpointCache.set(key, {
            value: nextValue,
            expiresAt: Date.now() + API_CACHE_TTL_MS,
            refreshing: false,
          });
        })
        .catch(() => {
          const stale = endpointCache.get(key);
          if (stale) stale.refreshing = false;
        });
    }

    return existing.value as T;
  }

  const value = await producer();

  if (!endpointCache.has(key) && endpointCache.size >= MAX_ENDPOINT_CACHE_ENTRIES) {
    const oldestKey = endpointCache.keys().next().value;
    if (oldestKey) endpointCache.delete(oldestKey);
  }

  endpointCache.set(key, {
    value,
    expiresAt: now + API_CACHE_TTL_MS,
    refreshing: false,
  });
  return value;
}

app.use(cors());
app.use(express.json());

app.use(async (req, _res, next) => {
  const delay = Number(req.query.delay) || 0;
  if (delay > 0) {
    await new Promise((resolve) => setTimeout(resolve, Math.min(delay, 30) * 1000));
  }
  next();
});

function getReviewTable(value: unknown): ReviewTable | null {
  const table = typeof value === 'string' ? value : 'hotel_reviews';
  return VALID_TABLES.includes(table as ReviewTable) ? (table as ReviewTable) : null;
}

app.get('/api/reviews', (req: Request, res: Response) => {
  const db = getDb();
  const table = getReviewTable(req.query.table);

  if (!table) {
    return res.status(400).json({ error: `Invalid table. Allowed values: ${VALID_TABLES.join(', ')}` });
  }

  const limit = Math.min(parseInt(String(req.query.limit ?? 50), 10) || 50, 500);
  const offset = Math.max(parseInt(String(req.query.offset ?? 0), 10) || 0, 0);
  const search = typeof req.query.search === 'string' && req.query.search ? `%${req.query.search}%` : null;

  let query = `SELECT * FROM ${table}`;
  let countQuery = `SELECT COUNT(*) as count FROM ${table}`;
  const params: Array<string | number> = [];

  if (search) {
    const where = ' WHERE review_text LIKE ? OR review_title LIKE ?';
    query += where;
    countQuery += where;
    params.push(search, search);
  }

  query += ' LIMIT ? OFFSET ?';

  const data = db.prepare(query).all(...params, limit, offset);
  const total = (db.prepare(countQuery).get(...params) as { count: number }).count;

  return res.json({ data, total, limit, offset, table });
});

app.get('/api/reviews/:id', (req: Request, res: Response) => {
  const db = getDb();
  const table = getReviewTable(req.query.table);

  if (!table) {
    return res.status(400).json({ error: 'Invalid table' });
  }

  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: 'id must be an integer' });

  const review = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id);
  if (!review) return res.status(404).json({ error: 'Review not found' });

  return res.json(review);
});

app.get('/api/hotels', (req: Request, res: Response) => {
  const db = getDb();
  const table = getReviewTable(req.query.table);

  if (!table) {
    return res.status(400).json({ error: 'Invalid table' });
  }

  const hotels = db
    .prepare(
      `SELECT DISTINCT name, address, city, country, latitude, longitude, postal_code, province
       FROM ${table}
       WHERE name IS NOT NULL
       ORDER BY name`
    )
    .all();

  return res.json({ data: hotels, table });
});

app.get('/api/stats', (_req: Request, res: Response) => {
  const db = getDb();
  const stats: Record<string, number> = {};
  for (const t of VALID_TABLES) {
    stats[t] = (db.prepare(`SELECT COUNT(*) as count FROM ${t}`).get() as { count: number }).count;
  }
  return res.json(stats);
});

const VIDEO_SOURCES = {
  '720p': { label: '720p', width: 1280, height: 720, url: 'https://filesamples.com/samples/video/mp4/sample_1280x720.mp4' },
  '1080p': { label: '1080p', width: 1920, height: 1080, url: 'https://filesamples.com/samples/video/mp4/sample_1920x1080.mp4' },
  '2k': { label: '2K', width: 2560, height: 1440, url: 'https://filesamples.com/samples/video/mp4/sample_1920x1080.mp4' },
  '4k': { label: '4K', width: 3840, height: 2160, url: 'https://filesamples.com/samples/video/mp4/sample_3840x2160.mp4' },
};

app.get('/api/media/video/:resolution', (req: Request, res: Response) => {
  const { resolution } = req.params;
  const meta = VIDEO_SOURCES[resolution.toLowerCase() as keyof typeof VIDEO_SOURCES];
  if (!meta) {
    return res.status(404).json({
      error: `Unknown resolution. Valid values: ${Object.keys(VIDEO_SOURCES).join(', ')}`,
    });
  }
  return res.json(meta);
});

app.get('/api/lighthouse/meta', async (_req: Request, res: Response) => {
  try {
    const payload = await getCachedValue(_req, 'lighthouse-meta', async () => {
      const dataset = await loadLighthouseDataset();
      const filters = buildFilterState(dataset);
      return {
        runs: dataset.runs,
        filters,
        latestRunFolder: dataset.latestRunFolder,
        sourceRoot: getResultsRoot(),
        contract: contractMetadata(),
        evaluationFocus: {
          lighthouse: 'Actionable performance audits only (LCP/FCP/performance relevance).',
          jmeter: 'Series-level response-time and success-rate summaries.',
        },
      };
    });

    return res.json(payload);
  } catch (error) {
    return res.status(500).json({ error: 'Unable to load lighthouse metadata.' });
  }
});

app.get('/api/lighthouse/graph/rows', async (req: Request, res: Response) => {
  try {
    const payload = await getCachedValue(req, 'lighthouse-graph-rows', async () => {
      const dataset = await loadLighthouseDataset();
      const rows = filterRows(dataset, req.query as Record<string, unknown>);
      return graphWindow(rows, req.query as Record<string, unknown>);
    });
    return res.json(payload);
  } catch {
    return res.status(500).json({ error: 'Unable to load graph rows.' });
  }
});

app.get('/api/lighthouse/table/filtered-rows', async (req: Request, res: Response) => {
  try {
    const paged = await getCachedValue(req, 'lighthouse-table-filtered-rows', async () => {
      const dataset = await loadLighthouseDataset();
      const filtered = filterRows(dataset, req.query as Record<string, unknown>);
      return paginateRows(filtered, parsePaginationQuery(req.query as Record<string, unknown>), [
        'runFolder', 'framework', 'version', 'preset', 'route',
      ]);
    });
    return res.json(paged);
  } catch {
    return res.status(500).json({ error: 'Unable to load filtered rows.' });
  }
});

app.get('/api/lighthouse/search/filtered-rows', async (req: Request, res: Response) => {
  try {
    const paged = await getCachedValue(req, 'lighthouse-search-filtered-rows', async () => {
      const dataset = await loadLighthouseDataset();
      const filtered = filterRows(dataset, req.query as Record<string, unknown>);
      return paginateRows(filtered, parsePaginationQuery(req.query as Record<string, unknown>), [
        'runFolder', 'framework', 'version', 'preset', 'route',
      ]);
    });
    return res.json(paged);
  } catch {
    return res.status(500).json({ error: 'Unable to search filtered rows.' });
  }
});

app.get('/api/lighthouse/table/platform-summary', async (req: Request, res: Response) => {
  try {
    const paged = await getCachedValue(req, 'lighthouse-table-platform-summary', async () => {
      const dataset = await loadLighthouseDataset();
      const rows = mapPlatformSummaryTable(dataset.rows);
      return paginateRows(rows, parsePaginationQuery(req.query as Record<string, unknown>), [
        'framework', 'route', 'preset', 'metric',
      ]);
    });
    return res.json(paged);
  } catch {
    return res.status(500).json({ error: 'Unable to load platform summary.' });
  }
});

app.get('/api/lighthouse/search/platform-summary', async (req: Request, res: Response) => {
  try {
    const paged = await getCachedValue(req, 'lighthouse-search-platform-summary', async () => {
      const dataset = await loadLighthouseDataset();
      const rows = mapPlatformSummaryTable(dataset.rows);
      return paginateRows(rows, parsePaginationQuery(req.query as Record<string, unknown>), [
        'framework', 'route', 'preset', 'metric',
      ]);
    });
    return res.json(paged);
  } catch {
    return res.status(500).json({ error: 'Unable to search platform summary.' });
  }
});

app.get('/api/lighthouse/table/trend-rows', async (req: Request, res: Response) => {
  try {
    const paged = await getCachedValue(req, 'lighthouse-table-trend-rows', async () => {
      const dataset = await loadLighthouseDataset();
      const filtered = filterRows(dataset, req.query as Record<string, unknown>);
      const metric = typeof req.query.metric === 'string' ? req.query.metric : 'largestContentfulPaintMs';
      const rows = mapTrendRowsTable(filtered, metric);
      return paginateRows(rows, parsePaginationQuery(req.query as Record<string, unknown>), [
        'run', 'framework', 'preset', 'route',
      ]);
    });
    return res.json(paged);
  } catch {
    return res.status(500).json({ error: 'Unable to load trend rows.' });
  }
});

app.get('/api/lighthouse/search/trend-rows', async (req: Request, res: Response) => {
  try {
    const paged = await getCachedValue(req, 'lighthouse-search-trend-rows', async () => {
      const dataset = await loadLighthouseDataset();
      const filtered = filterRows(dataset, req.query as Record<string, unknown>);
      const metric = typeof req.query.metric === 'string' ? req.query.metric : 'largestContentfulPaintMs';
      const rows = mapTrendRowsTable(filtered, metric);
      return paginateRows(rows, parsePaginationQuery(req.query as Record<string, unknown>), [
        'run', 'framework', 'preset', 'route',
      ]);
    });
    return res.json(paged);
  } catch {
    return res.status(500).json({ error: 'Unable to search trend rows.' });
  }
});

app.get('/api/lighthouse/table/runs', async (req: Request, res: Response) => {
  try {
    const paged = await getCachedValue(req, 'lighthouse-table-runs', async () => {
      const dataset = await loadLighthouseDataset();
      const rows = dataset.runs.map((run) => ({
        runFolder: run.runFolder,
        dateLabel: run.runFolder,
        rowCount: run.rowCount,
        frameworkCount: run.frameworks.length,
        frameworks: run.frameworks.join(', '),
        presets: run.presets.join(', '),
        routeCount: run.routes.length,
        iterationRange: `${run.iterationMin ?? 'n/a'} - ${run.iterationMax ?? 'n/a'}`,
        firstTimestamp: run.firstTimestamp,
        lastTimestamp: run.lastTimestamp,
      }));

      return paginateRows(rows, parsePaginationQuery(req.query as Record<string, unknown>), [
        'runFolder', 'frameworks', 'presets',
      ]);
    });
    return res.json(paged);
  } catch {
    return res.status(500).json({ error: 'Unable to load runs table.' });
  }
});

app.get('/api/lighthouse/search/runs', async (req: Request, res: Response) => {
  try {
    const paged = await getCachedValue(req, 'lighthouse-search-runs', async () => {
      const dataset = await loadLighthouseDataset();
      const rows = dataset.runs.map((run) => ({
        runFolder: run.runFolder,
        dateLabel: run.runFolder,
        rowCount: run.rowCount,
        frameworkCount: run.frameworks.length,
        frameworks: run.frameworks.join(', '),
        presets: run.presets.join(', '),
        routeCount: run.routes.length,
        iterationRange: `${run.iterationMin ?? 'n/a'} - ${run.iterationMax ?? 'n/a'}`,
        firstTimestamp: run.firstTimestamp,
        lastTimestamp: run.lastTimestamp,
      }));

      return paginateRows(rows, parsePaginationQuery(req.query as Record<string, unknown>), [
        'runFolder', 'frameworks', 'presets',
      ]);
    });
    return res.json(paged);
  } catch {
    return res.status(500).json({ error: 'Unable to search runs.' });
  }
});

app.get('/api/lighthouse/table/run-overview/:runFolder', async (req: Request, res: Response) => {
  try {
    const runFolder = decodeURIComponent(req.params.runFolder);
    const workspace = await getCachedValue(req, 'lighthouse-table-run-overview', () => runWorkspace(runFolder));
    if (!workspace) {
      return res.status(404).json({ error: 'Run not found.' });
    }
    const paged = paginateRows(workspace.overviewRows, parsePaginationQuery(req.query as Record<string, unknown>), [
      'framework', 'route', 'preset',
    ]);
    return res.json(paged);
  } catch {
    return res.status(500).json({ error: 'Unable to load run overview.' });
  }
});

app.get('/api/lighthouse/table/run-context/:runFolder', async (req: Request, res: Response) => {
  try {
    const runFolder = decodeURIComponent(req.params.runFolder);
    const workspace = await getCachedValue(req, 'lighthouse-table-run-context', () => runWorkspace(runFolder));
    if (!workspace) {
      return res.status(404).json({ error: 'Run not found.' });
    }
    const paged = paginateRows(workspace.contextRows, parsePaginationQuery(req.query as Record<string, unknown>), [
      'label', 'value',
    ]);
    return res.json(paged);
  } catch {
    return res.status(500).json({ error: 'Unable to load run context.' });
  }
});

app.get('/api/lighthouse/table/category-stats/:runFolder', async (req: Request, res: Response) => {
  try {
    const runFolder = decodeURIComponent(req.params.runFolder);
    const workspace = await getCachedValue(req, 'lighthouse-table-category-stats', () => runWorkspace(runFolder));
    if (!workspace) {
      return res.status(404).json({ error: 'Run not found.' });
    }
    const paged = paginateRows(workspace.categoryRows, parsePaginationQuery(req.query as Record<string, unknown>), [
      'category',
    ]);
    return res.json(paged);
  } catch {
    return res.status(500).json({ error: 'Unable to load category stats.' });
  }
});

app.get('/api/lighthouse/table/audit-index/:runFolder', async (req: Request, res: Response) => {
  try {
    const runFolder = decodeURIComponent(req.params.runFolder);
    const workspace = await getCachedValue(req, 'lighthouse-table-audit-index', () => runWorkspace(runFolder));
    if (!workspace) {
      return res.status(404).json({ error: 'Run not found.' });
    }
    const paged = paginateRows(workspace.auditRows, parsePaginationQuery(req.query as Record<string, unknown>), [
      'id', 'title', 'mode',
    ]);
    return res.json(paged);
  } catch {
    return res.status(500).json({ error: 'Unable to load audit index.' });
  }
});

app.get('/api/lighthouse/table/iteration/:runFolder/:iteration', async (req: Request, res: Response) => {
  try {
    const runFolder = decodeURIComponent(req.params.runFolder);
    const iteration = Number(req.params.iteration);
    const rows = await getCachedValue(req, 'lighthouse-table-iteration', () => iterationRows(runFolder, iteration));
    const paged = paginateRows(rows, parsePaginationQuery(req.query as Record<string, unknown>), [
      'framework', 'route', 'preset',
    ]);
    return res.json(paged);
  } catch {
    return res.status(500).json({ error: 'Unable to load iteration table.' });
  }
});

app.get('/api/lighthouse/table/audit-occurrences/:runFolder/:auditId', async (req: Request, res: Response) => {
  try {
    const runFolder = decodeURIComponent(req.params.runFolder);
    const auditId = decodeURIComponent(req.params.auditId);
    const rows = await getCachedValue(req, 'lighthouse-table-audit-occurrences', () => auditOccurrences(runFolder, auditId));
    const paged = paginateRows(rows, parsePaginationQuery(req.query as Record<string, unknown>), [
      'framework', 'route', 'preset', 'scoreMode', 'detailsType',
    ]);
    return res.json(paged);
  } catch {
    return res.status(500).json({ error: 'Unable to load audit occurrences.' });
  }
});

app.get('/api/lighthouse/run/:runFolder', async (req: Request, res: Response) => {
  try {
    const runFolder = decodeURIComponent(req.params.runFolder);
    const workspace = await getCachedValue(req, 'lighthouse-run-workspace', () => runWorkspace(runFolder));
    if (!workspace) {
      return res.status(404).json({ error: 'Run not found.' });
    }
    return res.json(workspace);
  } catch {
    return res.status(500).json({ error: 'Unable to load run workspace.' });
  }
});

app.get('/api/lighthouse/run/:runFolder/iteration/:iteration', async (req: Request, res: Response) => {
  try {
    const runFolder = decodeURIComponent(req.params.runFolder);
    const iteration = Number(req.params.iteration);
    if (!Number.isInteger(iteration)) {
      return res.status(400).json({ error: 'Iteration must be an integer.' });
    }
    const rows = await getCachedValue(req, 'lighthouse-run-iteration', async () => {
      const dataset = await loadLighthouseDataset();
      return dataset.rows.filter((row) => row.runFolder === runFolder && row.iteration === iteration);
    });
    return res.json({ runFolder, iteration, rows });
  } catch {
    return res.status(500).json({ error: 'Unable to load run iteration.' });
  }
});

app.get('/api/lighthouse/run/:runFolder/audit/:auditId', async (req: Request, res: Response) => {
  try {
    const runFolder = decodeURIComponent(req.params.runFolder);
    const auditId = decodeURIComponent(req.params.auditId);
    const detail = await getCachedValue(req, 'lighthouse-run-audit', () => auditDetail(runFolder, auditId));
    if (!detail) {
      return res.status(404).json({ error: 'Run not found.' });
    }
    return res.json(detail);
  } catch {
    return res.status(500).json({ error: 'Unable to load audit detail.' });
  }
});

app.get('/api/lighthouse/audits/summary', async (req: Request, res: Response) => {
  try {
    const summary = await getCachedValue(req, 'lighthouse-audits-summary', () => allRunsAuditSummary());
    return res.json(summary);
  } catch {
    return res.status(500).json({ error: 'Unable to load all-runs audit summary.' });
  }
});

app.get('/api/lighthouse/audit/:auditId', async (req: Request, res: Response) => {
  try {
    const auditId = decodeURIComponent(req.params.auditId);
    const detail = await getCachedValue(req, 'lighthouse-audit-detail-all-runs', () => auditDetailAllRuns(auditId));
    if (!detail) {
      return res.status(404).json({ error: 'Audit not found.' });
    }
    return res.json(detail);
  } catch {
    return res.status(500).json({ error: 'Unable to load all-runs audit detail.' });
  }
});

app.get('/api/lighthouse/heatmap-cell', async (req: Request, res: Response) => {
  const framework = typeof req.query.framework === 'string' ? req.query.framework : '';
  const preset = typeof req.query.preset === 'string' ? req.query.preset : '';
  const route = typeof req.query.route === 'string' ? req.query.route : '';

  if (!framework || !preset || !route) {
    return res.status(400).json({ error: 'framework, preset, and route are required' });
  }

  try {
    const details = await getCachedValue(req, 'lighthouse-heatmap-cell', () => heatmapCellDetails(framework, preset, route));
    return res.json({ framework, preset, route, ...details });
  } catch {
    return res.status(500).json({ error: 'Unable to load heatmap cell details.' });
  }
});

app.get('/api/jmeter/meta', async (_req: Request, res: Response) => {
  try {
    const payload = await getCachedValue(_req, 'jmeter-meta', async () => {
      const dataset = await loadJMeterDataset();
      return {
        files: dataset.files,
        availableSeries: [...new Set(dataset.rows.map((row) => row.series))].sort(),
        sourceRoot: dataset.root,
        contract: contractMetadata(),
      };
    });

    return res.json(payload);
  } catch {
    return res.status(500).json({ error: 'Unable to load JMeter metadata.' });
  }
});

app.get('/api/jmeter/graph/rows', async (req: Request, res: Response) => {
  try {
    const payload = await getCachedValue(req, 'jmeter-graph-rows', async () => {
      const dataset = await loadJMeterDataset();
      const rows = filterJMeterRows(dataset, req.query as Record<string, unknown>);
      return graphWindow(rows, req.query as Record<string, unknown>);
    });

    return res.json(payload);
  } catch {
    return res.status(500).json({ error: 'Unable to load JMeter graph rows.' });
  }
});

app.get('/api/jmeter/table/summary', async (req: Request, res: Response) => {
  try {
    const paged = await getCachedValue(req, 'jmeter-table-summary', async () => {
      const dataset = await loadJMeterDataset();
      const rows = filterJMeterRows(dataset, req.query as Record<string, unknown>);
      return paginateRows(rows, parsePaginationQuery(req.query as Record<string, unknown>), [
        'users', 'framework', 'version', 'series', 'fileName',
      ]);
    });

    return res.json(paged);
  } catch {
    return res.status(500).json({ error: 'Unable to load JMeter summary table.' });
  }
});

app.get('/api/jmeter/search/summary', async (req: Request, res: Response) => {
  try {
    const paged = await getCachedValue(req, 'jmeter-search-summary', async () => {
      const dataset = await loadJMeterDataset();
      const rows = filterJMeterRows(dataset, req.query as Record<string, unknown>);
      return paginateRows(rows, parsePaginationQuery(req.query as Record<string, unknown>), [
        'users', 'framework', 'version', 'series', 'fileName',
      ]);
    });

    return res.json(paged);
  } catch {
    return res.status(500).json({ error: 'Unable to search JMeter summary.' });
  }
});

app.get('/api/lighthouse/search/heatmap-cell-summary', async (req: Request, res: Response) => {
  const framework = typeof req.query.framework === 'string' ? req.query.framework : '';
  const preset = typeof req.query.preset === 'string' ? req.query.preset : '';
  const route = typeof req.query.route === 'string' ? req.query.route : '';

  if (!framework || !preset || !route) {
    return res.status(400).json({ error: 'framework, preset, and route are required' });
  }

  try {
    const paged = await getCachedValue(req, 'lighthouse-search-heatmap-cell-summary', async () => {
      const details = await heatmapCellDetails(framework, preset, route);
      const grouped = new Map<string, {
        auditId: string;
        title: string;
        occurrences: number;
        failed: number;
        informative: number;
        errors: number;
        manual: number;
        timeValues: number[];
      }>();

      for (const occurrence of details.occurrences) {
        const key = String(occurrence.auditId ?? occurrence.title ?? 'unknown');
        const current = grouped.get(key) ?? {
          auditId: String(occurrence.auditId ?? ''),
          title: String(occurrence.title ?? key),
          occurrences: 0,
          failed: 0,
          informative: 0,
          errors: 0,
          manual: 0,
          timeValues: [],
        };

        current.occurrences += 1;
        const bucket = String(occurrence.bucket ?? 'unknown');
        if (bucket === 'failed') current.failed += 1;
        if (bucket === 'informative') current.informative += 1;
        if (bucket === 'error') current.errors += 1;
        if (bucket === 'manual') current.manual += 1;

        if (Number.isFinite(occurrence.numericValue ?? Number.NaN)) {
          current.timeValues.push(Number(occurrence.numericValue));
        }

        grouped.set(key, current);
      }

      const rows = [...grouped.values()].map((row) => ({
        auditId: row.auditId,
        title: row.title,
        occurrences: row.occurrences,
        failed: row.failed,
        informative: row.informative,
        errors: row.errors,
        manual: row.manual,
        meanTimeMs: row.timeValues.length
          ? row.timeValues.reduce((sum, value) => sum + value, 0) / row.timeValues.length
          : Number.NaN,
      }));

      return paginateRows(rows, parsePaginationQuery(req.query as Record<string, unknown>), [
        'auditId', 'title', 'meanTimeMs',
      ]);
    });

    return res.json(paged);
  } catch {
    return res.status(500).json({ error: 'Unable to search heatmap summary rows.' });
  }
});

app.get('/api/lighthouse/search/heatmap-cell-details', async (req: Request, res: Response) => {
  const framework = typeof req.query.framework === 'string' ? req.query.framework : '';
  const preset = typeof req.query.preset === 'string' ? req.query.preset : '';
  const route = typeof req.query.route === 'string' ? req.query.route : '';

  if (!framework || !preset || !route) {
    return res.status(400).json({ error: 'framework, preset, and route are required' });
  }

  try {
    const paged = await getCachedValue(req, 'lighthouse-search-heatmap-cell-details', async () => {
      const details = await heatmapCellDetails(framework, preset, route);
      const rows = details.occurrences.map((occurrence) => ({
        runFolder: occurrence.runFolder,
        iteration: occurrence.iteration,
        auditId: occurrence.auditId,
        title: occurrence.title,
        bucket: occurrence.bucket,
        score: occurrence.score,
        timeMs: occurrence.numericValue,
        displayValue: occurrence.displayValue,
      }));

      return paginateRows(rows, parsePaginationQuery(req.query as Record<string, unknown>), [
        'runFolder', 'auditId', 'title', 'bucket', 'displayValue',
      ]);
    });

    return res.json(paged);
  } catch {
    return res.status(500).json({ error: 'Unable to search heatmap detail rows.' });
  }
});

function contentType(filePath: string): string {
  if (filePath.endsWith('.html')) return 'text/html; charset=utf-8';
  if (filePath.endsWith('.json')) return 'application/json; charset=utf-8';
  if (filePath.endsWith('.csv')) return 'text/csv; charset=utf-8';
  return 'application/octet-stream';
}

app.get('/api/lighthouse/artifact', async (req: Request, res: Response) => {
  const file = typeof req.query.file === 'string' ? req.query.file : '';
  const disposition = req.query.disposition === 'attachment' ? 'attachment' : 'inline';

  if (!file) return res.status(400).send('Missing file parameter');

  let absolutePath = '';
  try {
    absolutePath = resolveArtifactAbsolute(file);
  } catch {
    return res.status(400).send('Invalid file path');
  }

  try {
    const data = await fs.readFile(absolutePath);
    res.setHeader('content-type', contentType(absolutePath));
    res.setHeader('content-disposition', `${disposition}; filename="${path.basename(absolutePath)}"`);
    return res.send(data);
  } catch {
    return res.status(404).send('File not found');
  }
});

app.get('/health', (_req: Request, res: Response) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

const db = getDb();
seedHotelReviews(db);
seedHotelReviewsDataset(db);

app.listen(PORT, () => {
  console.log(`\n  Hotel Reviews API  ->  http://localhost:${PORT}\n`);
  console.log('  Endpoints:');
  console.log('    GET /api/reviews          ?table=hotel_reviews&limit=50&offset=0&delay=0&search=');
  console.log('    GET /api/reviews/:id      ?table=hotel_reviews&delay=0');
  console.log('    GET /api/hotels           ?table=hotel_reviews&delay=0');
  console.log('    GET /api/stats');
  console.log('    GET /api/media/video/:resolution   (720p|1080p|2k|4k)');
  console.log('    GET /api/lighthouse/meta');
  console.log('    GET /api/lighthouse/graph/rows');
  console.log('    GET /api/lighthouse/table/*  (paginated table endpoints)');
  console.log('    GET /api/lighthouse/search/* (search-first table endpoints)');
  console.log('    GET /api/lighthouse/heatmap-cell');
  console.log('    GET /api/lighthouse/artifact?file=...&disposition=inline|attachment');
  console.log('    GET /health\n');
});
