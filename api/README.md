# Hotel Reviews API

Express + SQLite REST API seeded from both CSV datasets.

## Setup

```bash
cd api
npm install
npm start          # seeds automatically on first run
# or
npm run dev        # with nodemon hot-reload
```

The server starts on **http://localhost:3001** by default.

## Environment variables

Copy `.env.example` to `.env` and adjust:

```
PORT=3001
```

## Lighthouse Benchmarks

Run from the `api/` folder after starting the framework apps on their assigned ports.

```powershell
npm run benchmark
npm run benchmark:smoke
```

The runner writes timestamped results under `api/results/lighthouse/`. Each run contains a normalized `summary.csv` plus per-iteration Lighthouse JSON, HTML, and CSV artifacts.

### Reproducibility notes

- Keep run folders immutable. Create new run folders for new measurements instead of rewriting old artifacts.
- For thesis-grade reporting, always cite: run folder, route, preset, iteration scope, and API schema version from `/api/lighthouse/meta`.
- The API now returns contract metadata (`schemaVersion`, `generatedAt`) and windowing metadata for graph endpoints.

Benchmark profiles:

- `perf` for mobile
- `desktop` for desktop

The benchmark matrix currently covers all framework variants in `frameworks/`, plus these routes:

- `/`
- `/text-only`
- `/list`
- `/text-images/480p`, `/text-images/720p`, `/text-images/1080p`, `/text-images/2k`, `/text-images/4k`
- `/text-videos/480p`, `/text-videos/720p`, `/text-videos/1080p`, `/text-videos/2k`, `/text-videos/4k`

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/reviews` | Paginated reviews |
| GET | `/api/reviews/:id` | Single review by integer id |
| GET | `/api/hotels` | Distinct hotels |
| GET | `/api/stats` | Row counts for both tables |
| GET | `/api/media/video/:resolution` | Video URL metadata |
| GET | `/api/lighthouse/meta` | Lighthouse run catalog, filter dimensions, and contract metadata |
| GET | `/api/lighthouse/graph/rows` | Filtered Lighthouse rows (windowed for performance) |
| GET | `/api/lighthouse/run/:runFolder` | Single-run workspace (overview, context, category stats, audit index, analysis metadata) |
| GET | `/api/lighthouse/run/:runFolder/audit/:auditId` | Detailed audit occurrences for one run |
| GET | `/api/lighthouse/audits/summary` | All-runs audit summary with analysis metadata |
| GET | `/api/lighthouse/heatmap-cell` | Per-cell audit evidence for framework/preset/route |
| GET | `/api/jmeter/meta` | JMeter file metadata and available series |
| GET | `/api/jmeter/graph/rows` | Filtered JMeter rows (windowed for performance) |
| GET | `/api/jmeter/table/summary` | Paginated JMeter summary table |
| GET | `/health` | Health check |

### Common query params

| Param | Default | Description |
|-------|---------|-------------|
| `table` | `hotel_reviews` | `hotel_reviews` \| `hotel_reviews_dataset` |
| `limit` | `50` | Rows per page (max 500) |
| `offset` | `0` | Pagination offset |
| `delay` | `0` | Simulated latency **in seconds** (max 30) |
| `search` | – | Filter by review text / title |

### Examples

```
GET /api/reviews?table=hotel_reviews_dataset&limit=100
GET /api/reviews?delay=2          # 2-second artificial delay
GET /api/reviews?search=breakfast
GET /api/media/video/1080p
GET /api/lighthouse/meta
GET /api/lighthouse/graph/rows?frameworks=nextjs-v14.2.3&limit=5000&offset=0
GET /api/lighthouse/run/2026-07-14T00-42-43.310Z
GET /api/lighthouse/run/2026-07-14T00-42-43.310Z/audit/largest-contentful-paint
GET /api/jmeter/graph/rows?frameworks=nextjs-v14.2.3&limit=5000&offset=0
```

## Graph endpoint safety contract

`/api/lighthouse/graph/rows` and `/api/jmeter/graph/rows` are intentionally windowed to avoid oversized payloads.

Response fields:

- `data`: selected row slice
- `total`: total rows matching filters
- `limit`: applied limit
- `offset`: applied offset
- `truncated`: true when not all matching rows were returned

Use additional filters or pagination to inspect very large result sets.
