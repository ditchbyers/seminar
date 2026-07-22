# Lighthouse Explorer

Next.js dashboard for analyzing Lighthouse and JMeter benchmark outputs served by the backend API.

## Run

```powershell
cd lighthouse-explorer
npm install
npm run dev
```

The dashboard runs on `http://localhost:3013`.

If your API is not running on `http://localhost:3001`, set one of:

- `LIGHTHOUSE_API_URL`
- `NEXT_PUBLIC_LIGHTHOUSE_API_URL`

## What it does

- Loads Lighthouse and JMeter datasets from API endpoints
- Supports scoped filters across runs, frameworks, presets, and routes
- Provides summary, trend, audit heatmap, and JMeter analysis views
- Supports single-run drilldown and audit-level diagnostic pages
- Highlights regression signals and Lighthouse/JMeter side-by-side evidence
- Exposes exportable chart/table outputs for thesis reporting

## Notes

- Start the API first (`cd api && npm run dev`) so the explorer can fetch data.
- The explorer preserves filter scope and tab context through URL state and session state.
- Graph endpoints are windowed by API safety limits for very large datasets; the UI warns when rows are truncated.
- For reproducible evaluation, keep raw output folders archived by run date and cite run folder IDs in documentation.
