'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type DashboardTab = 'summary' | 'trend' | 'heatmap' | 'jmeter';

export type HeaderKpis = {
  runs: string;
  frameworks: string;
  presets: string;
  routes: string;
};

type DashboardState = {
  activeTab: DashboardTab;
  isTabsFullscreen: boolean;
  selectedRunFolders: string[];
  selectedFrameworks: string[];
  selectedPresets: string[];
  selectedRoutes: string[];
  selectedAuditId: string | null;
  headerKpis: HeaderKpis | null;
  hydrateSelection: (selection: {
    selectedRunFolders?: string[];
    selectedFrameworks?: string[];
    selectedPresets?: string[];
    selectedRoutes?: string[];
    activeTab?: DashboardTab;
  }) => void;
  setActiveTab: (tab: DashboardTab) => void;
  toggleFullscreen: () => void;
  setFullscreen: (value: boolean) => void;
  setRunFolders: (next: string[]) => void;
  setFrameworks: (next: string[]) => void;
  setPresets: (next: string[]) => void;
  setRoutes: (next: string[]) => void;
  setSelectedAuditId: (auditId: string | null) => void;
  setHeaderKpis: (kpis: HeaderKpis | null) => void;
  goToAudit: (auditId: string) => void;
};

/**
 * Shared homepage state: centralized filters (run/framework/platform/route), the active
 * tab, and the selected audit. This app is primarily a single homepage fanning out to
 * sibling tab components that all need this same cross-cutting state, so a small store
 * removes the prop-drilling / render-prop threading that previously carried this state
 * (and the filter UI itself) through component props.
 *
 * Server data (rows, runs, audit detail payloads) intentionally stays OUT of this store —
 * that's request-scoped data owned by the components/pages that fetch it.
 */
export const useDashboardStore = create<DashboardState>()(persist(
  (set) => ({
    activeTab: 'summary',
    isTabsFullscreen: false,
    selectedRunFolders: [],
    selectedFrameworks: [],
    selectedPresets: [],
    selectedRoutes: [],
    selectedAuditId: null,
    headerKpis: null,
    hydrateSelection: (selection) => set((state) => ({
      activeTab: selection.activeTab ?? state.activeTab,
      selectedRunFolders: selection.selectedRunFolders ?? state.selectedRunFolders,
      selectedFrameworks: selection.selectedFrameworks ?? state.selectedFrameworks,
      selectedPresets: selection.selectedPresets ?? state.selectedPresets,
      selectedRoutes: selection.selectedRoutes ?? state.selectedRoutes,
      selectedAuditId: null,
    })),
    setActiveTab: (activeTab) => set({ activeTab }),
    toggleFullscreen: () => set((state) => ({ isTabsFullscreen: !state.isTabsFullscreen })),
    setFullscreen: (isTabsFullscreen) => set({ isTabsFullscreen }),
    setRunFolders: (selectedRunFolders) => set({ selectedRunFolders, selectedAuditId: null }),
    setFrameworks: (selectedFrameworks) => set({ selectedFrameworks, selectedAuditId: null }),
    setPresets: (selectedPresets) => set({ selectedPresets, selectedAuditId: null }),
    setRoutes: (selectedRoutes) => set({ selectedRoutes, selectedAuditId: null }),
    setSelectedAuditId: (selectedAuditId) => set({ selectedAuditId }),
    setHeaderKpis: (headerKpis) => set({ headerKpis }),
    goToAudit: (auditId) => set({ selectedAuditId: auditId, activeTab: 'heatmap' }),
  }),
  {
    name: 'lighthouse-dashboard-state-v1',
    storage: createJSONStorage(() => sessionStorage),
    partialize: (state) => ({
      activeTab: state.activeTab,
      selectedRunFolders: state.selectedRunFolders,
      selectedFrameworks: state.selectedFrameworks,
      selectedPresets: state.selectedPresets,
      selectedRoutes: state.selectedRoutes,
    }),
  }
));

/** A single selected run enables single-run drilldown; zero or multiple = cross-run "all runs" mode. */
export function useEffectiveSingleRunFolder(): string | null {
  const selectedRunFolders = useDashboardStore((state) => state.selectedRunFolders);
  return selectedRunFolders.length === 1 ? selectedRunFolders[0] : null;
}
