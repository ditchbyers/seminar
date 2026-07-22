'use client';

import DataTable from '@/components/data-table';

type IterationRow = {
  framework: string;
  route: string;
  preset: string;
  score: string;
  fcp: string;
  lcp: string;
  tbt: string;
  cls: string;
  mainThread: string;
  transfer: string;
};

type IterationTableProps = {
  rows: IterationRow[];
};

const columns = [
  { accessorKey: 'framework', header: 'Framework', enableSorting: true },
  { accessorKey: 'route', header: 'Route', enableSorting: true },
  { accessorKey: 'preset', header: 'Preset', enableSorting: true },
  { accessorKey: 'score', header: 'Score', enableSorting: true },
  { accessorKey: 'fcp', header: 'FCP', enableSorting: true },
  { accessorKey: 'lcp', header: 'LCP', enableSorting: true },
  { accessorKey: 'tbt', header: 'TBT', enableSorting: true },
  { accessorKey: 'cls', header: 'CLS', enableSorting: true },
  { accessorKey: 'mainThread', header: 'Main Thread', enableSorting: true },
  { accessorKey: 'transfer', header: 'Transfer', enableSorting: true },
];

export default function IterationTable({ rows }: IterationTableProps) {
  return (
    <DataTable
      columns={columns}
      data={rows}
      title="Iteration measurements"
      fileName="iteration-measurements.csv"
      searchPlaceholder="Search measurements..."
      defaultPageSize={25}
      compact
    />
  );
}
