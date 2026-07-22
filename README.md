# Framework Performance Benchmark

A multi-framework web performance benchmark project comparing Astro, Next.js, Angular, and Nuxt.js across multiple versions.

## Architecture

- **API backend**: Node.js + Express + SQLite (port 3001)
- **12 framework instances**: 3 versions × 4 frameworks
- **JMeter test plans**: 100, 300, 500 concurrent users targeting `/list`

## Port Map

| Framework | Version | Port |
|-----------|---------|------|
| Astro | v4.10.2 | 4321 |
| Astro | v5.1.5 | 4322 |
| Astro | latest | 4323 |
| Next.js | v14.2.3 | 3010 |
| Next.js | v15.1.4 | 3011 |
| Next.js | latest | 3012 |
| Angular | v17.3.6 | 4200 |
| Angular | v19.1 | 4201 |
| Angular | latest | 4202 |
| Nuxt.js | v3.11.2 | 3020 |
| Nuxt.js | v4.2.2 | 3021 |
| Nuxt.js | latest | 3022 |

## Routes (per framework)

| Route | Description |
|-------|-------------|
| `/` | Home / overview |
| `/text-only` | Reviews without media |
| `/text-images/[resolution]` | Reviews with images at 480p / 720p / 1080p / 2k / 4k |
| `/text-videos/[resolution]` | Reviews with embedded videos at 480p / 720p / 1080p / 2k / 4k |
| `/list` | 100-item list — **JMeter benchmark target** |

## API Endpoints

```
GET /api/reviews?table=hotel_reviews&limit=50&offset=0&delay=0&search=
GET /api/reviews/:id?table=hotel_reviews
GET /api/hotels?table=hotel_reviews
GET /api/stats
GET /api/media/video/:resolution   # 480p | 720p | 1080p | 2k | 4k
GET /health
```

Query params:
- `table` — `hotel_reviews` (default) or `hotel_reviews_dataset`
- `delay` — artificial latency in seconds (max 30)
- `limit` — max 500

## Tailwind Strategy

- **Versioned frameworks** (v4/v5/v14/v15/v17/v19/v3/v4.2): Tailwind **v3** via `tailwind.config.js`
- **Latest variants**: Tailwind **v4** — CSS-first via `@import "tailwindcss"`, no config file needed

## Setup

Run `setup.ps1` to install all dependencies:

```powershell
.\setup.ps1
```

Or install manually:

```powershell
# API
cd api ; npm install ; cd ..

# Frameworks
foreach ($dir in Get-ChildItem frameworks -Directory) {
  cd frameworks\$($dir.Name) ; npm install ; cd ..\..
}
```

## Starting the API

```powershell
cd api
npm start       # production
npm run dev     # development (nodemon)
```

## Starting a Framework

```powershell
cd frameworks/astro-v4.10.2
npm run dev       # development
npm run build ; npm start   # production
```

> Angular uses `ng serve` internally via `npm start`.

## Running JMeter Tests

1. Start the API and all 12 framework instances
2. Create the results directory: `mkdir jmeter/results`
3. Run a plan:

```bash
jmeter -n -t jmeter/100-users.jmx -l jmeter/results/100-users.csv -e -o jmeter/results/100-report
```

Available plans: `jmeter/100-users.jmx`, `jmeter/300-users.jmx`, `jmeter/500-users.jmx`

## Running Lighthouse Benchmarks

The Lighthouse runner lives in `api/` and expects the framework apps to be running on their documented ports.

```powershell
cd api
npm run benchmark         # full matrix
npm run benchmark:smoke   # one framework, one route, both presets
```

Outputs are written to `api/results/lighthouse/<timestamp>/` and include:

- `summary.csv` for graphing
- Raw Lighthouse JSON reports
- Raw Lighthouse HTML reports
- Raw Lighthouse CSV reports

The runner measures each configured route in both Lighthouse profiles: mobile (`perf`) and desktop (`desktop`).

## Lighthouse Dashboard

The Lighthouse analysis UI now lives in its own Next.js project at `lighthouse-dashboard/`.

```powershell
cd lighthouse-dashboard
npm install
npm run dev
```

It reads all archived benchmark runs from `api/results/lighthouse/` and provides filterable scientific summaries, iteration drill-down, and raw report links.

## Data Sources

- `data/hotel_reviews.csv` → table `hotel_reviews`
- `data/hotel_reviews_dataset.csv` → table `hotel_reviews_dataset`

The API auto-seeds both tables on first startup.
