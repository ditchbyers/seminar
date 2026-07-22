'use client';

import { type ReactNode } from 'react';
import { MultiSelectCombobox } from '@/components/ui/multi-select-combobox';
import { useDashboardStore } from '@/lib/dashboard-store';
import { type LighthouseFilterState } from '@/lib/lighthouse-api';

export type ExtraFilterControl = {
  key: string;
  label: string;
  control: ReactNode;
};

type DashboardTopFiltersProps = {
  filters: LighthouseFilterState;
  extraFilters?: ExtraFilterControl[];
};

export default function DashboardTopFilters({
  filters,
  extraFilters = [],
}: DashboardTopFiltersProps) {
  const selectedRunFolders = useDashboardStore((state) => state.selectedRunFolders);
  const selectedFrameworks = useDashboardStore((state) => state.selectedFrameworks);
  const selectedPresets = useDashboardStore((state) => state.selectedPresets);
  const selectedRoutes = useDashboardStore((state) => state.selectedRoutes);
  const setRunFolders = useDashboardStore((state) => state.setRunFolders);
  const setFrameworks = useDashboardStore((state) => state.setFrameworks);
  const setPresets = useDashboardStore((state) => state.setPresets);
  const setRoutes = useDashboardStore((state) => state.setRoutes);

  return (
    <section className="sticky top-0 z-20 mt-3 rounded-xl border border-white/8 bg-card/95 p-3 backdrop-blur-md">
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-62.5 shrink-0 space-y-1.5">
          <label className="text-[11px] font-medium text-muted-foreground">Run</label>
          <MultiSelectCombobox
            placeholder="All runs"
            searchPlaceholder="Search runs..."
            options={filters.runFolders.map((runFolder) => ({ value: runFolder, label: runFolder }))}
            selected={selectedRunFolders}
            onChange={setRunFolders}
          />
        </div>

        <div className="w-62.5 shrink-0 space-y-1.5">
          <label className="text-[11px] font-medium text-muted-foreground">Framework</label>
          <MultiSelectCombobox
            placeholder="All frameworks"
            searchPlaceholder="Search frameworks..."
            options={filters.frameworks.map((framework) => ({ value: framework, label: framework }))}
            selected={selectedFrameworks}
            onChange={setFrameworks}
          />
        </div>

        <div className="w-62.5 shrink-0 space-y-1.5">
          <label className="text-[11px] font-medium text-muted-foreground">Platform</label>
          <MultiSelectCombobox
            placeholder="All platforms"
            searchPlaceholder="Search platforms..."
            options={filters.presets.map((preset) => ({ value: preset, label: preset }))}
            selected={selectedPresets}
            onChange={setPresets}
          />
        </div>

        <div className="w-62.5 shrink-0 space-y-1.5">
          <label className="text-[11px] font-medium text-muted-foreground">Route</label>
          <MultiSelectCombobox
            placeholder="All routes"
            searchPlaceholder="Search routes..."
            options={filters.routes.map((route) => ({ value: route, label: route }))}
            selected={selectedRoutes}
            onChange={setRoutes}
          />
        </div>

        {extraFilters.map((extraFilter) => (
          <div key={extraFilter.key} className="w-62.5 shrink-0 space-y-1.5">
            <label className="text-[11px] font-medium text-muted-foreground">{extraFilter.label}</label>
            {extraFilter.control}
          </div>
        ))}
      </div>
    </section>
  );
}
