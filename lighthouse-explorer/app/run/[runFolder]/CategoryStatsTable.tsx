'use client';

import DataTable from '@/components/data-table';

type CategoryStatsRow = {
  category: string;
  average: string;
  minimum: string;
  maximum: string;
};

type CategoryStatsTableProps = {
  rows: CategoryStatsRow[];
};

const columns = [
  { accessorKey: 'category', header: 'Category', enableSorting: true },
  { accessorKey: 'average', header: 'Average', enableSorting: true },
  { accessorKey: 'minimum', header: 'Minimum', enableSorting: true },
  { accessorKey: 'maximum', header: 'Maximum', enableSorting: true },
];

export default function CategoryStatsTable({ rows }: CategoryStatsTableProps) {
  return (
    <DataTable
      columns={columns}
      data={rows}
      title="Category stats"
      fileName="category-stats.csv"
      searchPlaceholder="Search categories..."
      defaultPageSize={25}
      compact
    />
  );
}
