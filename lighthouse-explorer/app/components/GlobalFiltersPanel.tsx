'use client';

import { MultiSelectCombobox } from '@/components/ui/multi-select-combobox';
import { useDashboardStore } from '@/lib/dashboard-store';
import { type LighthouseFilterState } from '@/lib/lighthouse-api';

type GlobalFiltersPanelProps = {
  filters: LighthouseFilterState;
  className?: string;
};

/**
 * Single source of truth for the centralized run/framework/platform/route filters.
 * Reads and writes `useDashboardStore` directly, so it can be rendered independently
 * in every tab (Summary/Trend/Heatmap/JMeter) without threading a rendered ReactNode
 * through component props.
 */
export default function GlobalFiltersPanel({ filters, className }: GlobalFiltersPanelProps) {
  const selectedRunFolders = useDashboardStore((state) => state.selectedRunFolders);
  const selectedFrameworks = useDashboardStore((state) => state.selectedFrameworks);
  const selectedPresets = useDashboardStore((state) => state.selectedPresets);
  const selectedRoutes = useDashboardStore((state) => state.selectedRoutes);
  const setRunFolders = useDashboardStore((state) => state.setRunFolders);
  const setFrameworks = useDashboardStore((state) => state.setFrameworks);
  const setPresets = useDashboardStore((state) => state.setPresets);
  const setRoutes = useDashboardStore((state) => state.setRoutes);

  return (
    <section className={className ?? 'w-full rounded-xl border border-white/8 bg-card/60 p-4'}>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 2xl:grid-cols-4">
        <div className="space-y-1.5">
          <label className="text-[11px] font-medium text-muted-foreground">Run</label>
          <MultiSelectCombobox
            placeholder="All runs"
            searchPlaceholder="Search runs..."
            options={filters.runFolders.map((runFolder) => ({ value: runFolder, label: runFolder }))}
            selected={selectedRunFolders}
            onChange={setRunFolders}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-medium text-muted-foreground">Framework</label>
          <MultiSelectCombobox
            placeholder="All frameworks"
            searchPlaceholder="Search frameworks..."
            options={filters.frameworks.map((framework) => ({ value: framework, label: framework }))}
            selected={selectedFrameworks}
            onChange={setFrameworks}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-medium text-muted-foreground">Platform</label>
          <MultiSelectCombobox
            placeholder="All platforms"
            searchPlaceholder="Search platforms..."
            options={filters.presets.map((preset) => ({ value: preset, label: preset }))}
            selected={selectedPresets}
            onChange={setPresets}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-medium text-muted-foreground">Route</label>
          <MultiSelectCombobox
            placeholder="All routes"
            searchPlaceholder="Search routes..."
            options={filters.routes.map((route) => ({ value: route, label: route }))}
            selected={selectedRoutes}
            onChange={setRoutes}
          />
        </div>
      </div>
    </section>
  );
}
