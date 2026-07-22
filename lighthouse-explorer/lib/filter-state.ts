type ParamValue = string | string[] | undefined;

type FilterDefaults = {
  runFolders: string[];
  frameworks: string[];
  presets: string[];
  routes: string[];
  iterations: number[];
};

type SelectionState = {
  selectedRunFolders: string[];
  selectedFrameworks: string[];
  selectedPresets: string[];
  selectedRoutes: string[];
  activeTab?: 'summary' | 'trend' | 'heatmap' | 'jmeter';
  iterationMin: number;
  iterationMax: number;
  focusIteration?: number;
  routeSearch: string;
  runFolderFilterSearch?: string;
  frameworkFilterSearch?: string;
  platformFilterSearch?: string;
  routeFilterSearch?: string;
  mainMetric?: string;
  mainChartType?: string;
  trendMetric: string;
  trendChartType: string;
};

function asArray(value: ParamValue): string[] {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string' && value.trim()) return value.split(',').map((item) => item.trim()).filter(Boolean);
  return [];
}

function asString(value: ParamValue): string {
  if (Array.isArray(value)) return value[0] ?? '';
  if (typeof value === 'string') return value;
  return '';
}

function asNumber(value: ParamValue, fallback: number): number {
  const raw = asString(value);
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function asDashboardTab(value: ParamValue): SelectionState['activeTab'] {
  const raw = asString(value);
  return raw === 'summary' || raw === 'trend' || raw === 'heatmap' || raw === 'jmeter'
    ? raw
    : undefined;
}

function pickAllowed(requested: string[], allowed: string[], fallback: string[]): string[] {
  const allowedSet = new Set(allowed);
  const picked = requested.filter((item) => allowedSet.has(item));
  return picked.length ? picked : fallback;
}

export function getSelectionFromSearchParams(
  filters: FilterDefaults,
  searchParams: Record<string, ParamValue> = {},
  options: { lockedRunFolder?: string } = {}
) {
  const { lockedRunFolder } = options;

  const requestedRuns = asArray(searchParams.runs);
  const requestedFrameworks = asArray(searchParams.frameworks);
  const requestedPresets = asArray(searchParams.presets);
  const requestedRoutes = asArray(searchParams.routes);

  const minIteration = filters.iterations[0] ?? 1;
  const maxIteration = filters.iterations[filters.iterations.length - 1] ?? minIteration;

  const selectedRunFolders = lockedRunFolder
    ? [lockedRunFolder]
    : pickAllowed(requestedRuns, filters.runFolders, filters.runFolders);

  const selectedFrameworks = pickAllowed(requestedFrameworks, filters.frameworks, filters.frameworks);
  const selectedPresets = pickAllowed(requestedPresets, filters.presets, filters.presets);
  const selectedRoutes = pickAllowed(requestedRoutes, filters.routes, filters.routes);

  return {
    selectedRunFolders,
    selectedFrameworks,
    selectedPresets,
    selectedRoutes,
    activeTab: asDashboardTab(searchParams.tab),
    iterationMin: Math.max(minIteration, Math.min(maxIteration, asNumber(searchParams.iterMin, minIteration))),
    iterationMax: Math.max(minIteration, Math.min(maxIteration, asNumber(searchParams.iterMax, maxIteration))),
    focusIteration: Math.max(minIteration, Math.min(maxIteration, asNumber(searchParams.focusIteration, minIteration))),
    routeSearch: asString(searchParams.routeSearch),
    mainMetric: asString(searchParams.mainMetric) || 'performanceScore',
    mainChartType: asString(searchParams.mainChartType) || 'scatter',
    trendMetric: asString(searchParams.trendMetric) || 'largestContentfulPaintMs',
    trendChartType: asString(searchParams.trendChartType) || 'line',
  };
}

export function buildSearchParamsFromSelection(
  selection: SelectionState,
  defaults: FilterDefaults,
  options: { lockedRunFolder?: string } = {}
): URLSearchParams {
  const { lockedRunFolder } = options;
  const params = new URLSearchParams();

  if (lockedRunFolder) {
    params.set('runs', lockedRunFolder);
  } else if (selection.selectedRunFolders.length !== defaults.runFolders.length) {
    params.set('runs', selection.selectedRunFolders.join(','));
  }

  if (selection.selectedFrameworks.length !== defaults.frameworks.length) {
    params.set('frameworks', selection.selectedFrameworks.join(','));
  }

  if (selection.selectedPresets.length !== defaults.presets.length) {
    params.set('presets', selection.selectedPresets.join(','));
  }

  if (selection.selectedRoutes.length !== defaults.routes.length) {
    params.set('routes', selection.selectedRoutes.join(','));
  }

  if (selection.activeTab && selection.activeTab !== 'summary') {
    params.set('tab', selection.activeTab);
  }

  const minIteration = defaults.iterations[0] ?? 1;
  const maxIteration = defaults.iterations[defaults.iterations.length - 1] ?? 1;

  if (selection.iterationMin !== minIteration) {
    params.set('iterMin', String(selection.iterationMin));
  }

  if (selection.iterationMax !== maxIteration) {
    params.set('iterMax', String(selection.iterationMax));
  }

  if (Number.isFinite(selection.focusIteration) && selection.focusIteration !== minIteration) {
    params.set('focusIteration', String(selection.focusIteration));
  }

  if (selection.routeSearch.trim()) {
    params.set('routeSearch', selection.routeSearch.trim());
  }

  if (selection.mainMetric !== 'performanceScore') params.set('mainMetric', selection.mainMetric);
  if (selection.mainChartType !== 'scatter') params.set('mainChartType', selection.mainChartType);
  if (selection.trendMetric !== 'largestContentfulPaintMs') params.set('trendMetric', selection.trendMetric);
  if (selection.trendChartType !== 'line') params.set('trendChartType', selection.trendChartType);

  return params;
}
