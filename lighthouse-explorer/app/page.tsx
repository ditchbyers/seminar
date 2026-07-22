import { getSelectionFromSearchParams } from '../lib/filter-state';
import HomeDashboard from './components/HomeDashboard';
import {
  fetchGraphRowsAll,
  fetchJMeterMeta,
  fetchJMeterSummaryRowsAll,
  fetchLighthouseMeta,
  type JMeterFileMeta,
  type JMeterSummaryRow,
  type LighthouseFilterState,
  type LighthouseRunMeta,
} from '@/lib/lighthouse-api';

export const dynamic = 'force-dynamic';

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const resolvedSearchParams = await searchParams;

  let runs: LighthouseRunMeta[] = [];
  let filters: LighthouseFilterState = {
    runFolders: [],
    frameworks: [],
    presets: [],
    routes: [],
    iterations: [],
  };
  let rows: Awaited<ReturnType<typeof fetchGraphRowsAll>>['data'] = [];
  let jmeterRows: JMeterSummaryRow[] = [];
  let jmeterFiles: JMeterFileMeta[] = [];
  let sourceLabel = 'Backend Lighthouse API';
  let loadError = '';
  let jmeterLoadError = '';
  let graphTruncated = false;
  let graphTotal = 0;
  let contractVersion = '';

  try {
    const [meta, filteredRows] = await Promise.all([
      fetchLighthouseMeta(),
      fetchGraphRowsAll(),
    ]);
    runs = meta.runs;
    filters = meta.filters;
    rows = filteredRows.data;
    graphTruncated = Boolean(filteredRows.truncated);
    graphTotal = filteredRows.total;
    contractVersion = meta.contract?.schemaVersion ?? '';
  } catch (error) {
    loadError = error instanceof Error ? error.message : 'Unknown backend error';
    sourceLabel = 'Backend Lighthouse API (error state)';
  }

  try {
    const [jmeterMeta, jmeterSummaryRows] = await Promise.all([
      fetchJMeterMeta(),
      fetchJMeterSummaryRowsAll(),
    ]);
    jmeterFiles = jmeterMeta.files;
    jmeterRows = jmeterSummaryRows.data;
  } catch (error) {
    jmeterLoadError = error instanceof Error ? error.message : 'Unknown JMeter backend error';
  }

  const dataset = {
    rows,
    runs,
    source: 'api',
    sourceLabel,
  };

  const initialSelection = getSelectionFromSearchParams(filters, resolvedSearchParams ?? {});

  return (
    <HomeDashboard
      rows={dataset.rows}
      runs={dataset.runs}
      filters={filters}
      initialSelection={initialSelection}
      loadError={loadError}
      graphTruncated={graphTruncated}
      graphTotal={graphTotal}
      contractVersion={contractVersion}
      jmeterRows={jmeterRows}
      jmeterFiles={jmeterFiles}
      jmeterLoadError={jmeterLoadError}
    />
  );
}
