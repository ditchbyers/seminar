'use client';

import DataTable from '@/components/data-table';

type RunContextRow = {
  label: string;
  value: string;
};

type RunContextTableProps = {
  rows: RunContextRow[];
};

const columns = [
  { accessorKey: 'label', header: 'Property', enableSorting: false },
  { accessorKey: 'value', header: 'Value', enableSorting: false },
];

export default function RunContextTable({ rows }: RunContextTableProps) {
  return (
    <DataTable
      columns={columns}
      data={rows}
      title="Run context"
      fileName="run-context.csv"
      searchPlaceholder="Search context..."
      defaultPageSize={25}
      compact
    />
  );
}
