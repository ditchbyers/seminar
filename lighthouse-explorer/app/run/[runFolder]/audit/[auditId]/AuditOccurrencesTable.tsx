'use client';

import DataTable from '@/components/data-table';
import { artifactUrl } from '@/lib/lighthouse-api';

type AuditOccurrenceRow = {
  framework: string;
  route: string;
  preset: string;
  iteration: number;
  scoreMode: string;
  score: string;
  numericValue: string;
  displayValue: string;
  detailsType: string;
  itemCount: number;
  jsonLink?: string;
};

type AuditOccurrencesTableProps = {
  rows: AuditOccurrenceRow[];
};

const columns = [
  { accessorKey: 'framework', header: 'Framework', enableSorting: true },
  { accessorKey: 'route', header: 'Route', enableSorting: true },
  { accessorKey: 'preset', header: 'Preset', enableSorting: true },
  { accessorKey: 'iteration', header: 'Iter', enableSorting: true },
  { accessorKey: 'scoreMode', header: 'Score Mode', enableSorting: true },
  { accessorKey: 'score', header: 'Score', enableSorting: true },
  { accessorKey: 'numericValue', header: 'Numeric Value', enableSorting: true },
  { accessorKey: 'displayValue', header: 'Display', enableSorting: false },
  { accessorKey: 'detailsType', header: 'Details Type', enableSorting: true },
  { accessorKey: 'itemCount', header: 'Items', enableSorting: true },
  {
    accessorKey: 'report',
    header: 'Report',
    enableSorting: false,
    cell: ({ row }: { row: { original: AuditOccurrenceRow } }) => row.original.jsonLink ? (
      <a href={artifactUrl(row.original.jsonLink, 'inline')}
        target="_blank" rel="noreferrer"
        className="text-cyan-400 hover:text-cyan-200 text-[11px]">
        JSON
      </a>
    ) : <span className="text-muted-foreground text-[11px]">—</span>,
  },
];

export default function AuditOccurrencesTable({ rows }: AuditOccurrencesTableProps) {
  return (
    <DataTable
      columns={columns}
      data={rows}
      title="Audit occurrences"
      fileName="audit-occurrences.csv"
      searchPlaceholder="Search occurrences..."
      defaultPageSize={25}
      compact
    />
  );
}
