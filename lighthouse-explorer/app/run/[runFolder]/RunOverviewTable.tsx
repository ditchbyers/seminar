'use client';

import DataTable from '@/components/data-table';
import { artifactUrl } from '@/lib/lighthouse-api';

type RunOverviewRow = {
  framework: string;
  route: string;
  preset: string;
  iteration: number;
  performance: string;
  fcp: string;
  lcp: string;
  tbt: string;
  cls: string;
  warnings: number;
  json?: string;
  html?: string;
  csv?: string;
};

type RunOverviewTableProps = {
  rows: RunOverviewRow[];
};

const columns = [
  { accessorKey: 'framework', header: 'Framework', enableSorting: true },
  { accessorKey: 'route', header: 'Route', enableSorting: true },
  { accessorKey: 'preset', header: 'Preset', enableSorting: true },
  { accessorKey: 'iteration', header: 'Iter', enableSorting: true },
  { accessorKey: 'performance', header: 'Perf', enableSorting: true },
  { accessorKey: 'fcp', header: 'FCP', enableSorting: true },
  { accessorKey: 'lcp', header: 'LCP', enableSorting: true },
  { accessorKey: 'tbt', header: 'TBT', enableSorting: true },
  { accessorKey: 'cls', header: 'CLS', enableSorting: true },
  { accessorKey: 'warnings', header: 'Warn', enableSorting: true },
  {
    accessorKey: 'artifacts',
    header: 'Artifacts',
    enableSorting: false,
    cell: ({ row }: { row: { original: RunOverviewRow } }) => (
      <div className="flex gap-2 text-[11px]">
        {row.original.json && (
          <a href={artifactUrl(row.original.json, 'inline')} target="_blank" rel="noreferrer"
            className="text-cyan-400 hover:text-cyan-200">json</a>
        )}
        {row.original.html && (
          <a href={artifactUrl(row.original.html, 'inline')} target="_blank" rel="noreferrer"
            className="text-cyan-400 hover:text-cyan-200">html</a>
        )}
        {row.original.csv && (
          <a href={artifactUrl(row.original.csv, 'attachment')} target="_blank" rel="noreferrer"
            className="text-cyan-400 hover:text-cyan-200">csv</a>
        )}
      </div>
    ),
  },
];

export default function RunOverviewTable({ rows }: RunOverviewTableProps) {
  return (
    <DataTable
      columns={columns}
      data={rows}
      title="Run overview"
      fileName="run-overview-rows.csv"
      searchPlaceholder="Search rows..."
      defaultPageSize={25}
      compact
    />
  );
}
