'use client';

import Link from 'next/link';
import DataTable from '@/components/data-table';

type AuditIndexRow = {
  id: string;
  title: string;
  mode: string;
  categoryRefs: string;
  occurrences: number;
  failures: number;
  items: number;
  avgScore: string;
  savingsFcp: string;
  savingsLcp: string;
};

type AuditIndexTableProps = {
  rows: AuditIndexRow[];
  runFolder: string;
};

function makeColumns(runFolder: string) {
  return [
    {
      accessorKey: 'title',
      header: 'Audit',
      enableSorting: true,
      cell: ({ row }: { row: { original: AuditIndexRow } }) => (
        <div>
          <p className="text-foreground/90">{row.original.title}</p>
          <p className="text-[10px] text-muted-foreground/60 mt-0.5">{row.original.id}</p>
        </div>
      ),
    },
    { accessorKey: 'mode', header: 'Mode', enableSorting: true },
    { accessorKey: 'categoryRefs', header: 'Category Refs', enableSorting: false },
    { accessorKey: 'occurrences', header: 'Occur.', enableSorting: true },
    {
      accessorKey: 'failures',
      header: 'Failures',
      enableSorting: true,
      cell: ({ getValue }: { getValue: () => number }) => (
        <span className={getValue() > 0 ? 'text-rose-400 font-medium' : 'text-muted-foreground'}>
          {getValue()}
        </span>
      ),
    },
    { accessorKey: 'items', header: 'Items', enableSorting: true },
    { accessorKey: 'avgScore', header: 'Avg Score', enableSorting: true },
    { accessorKey: 'savingsFcp', header: 'FCP Save', enableSorting: true },
    { accessorKey: 'savingsLcp', header: 'LCP Save', enableSorting: true },
    {
      accessorKey: 'action',
      header: 'Action',
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }: { row: { original: AuditIndexRow } }) => (
        <Link
          href={`/run/${encodeURIComponent(runFolder)}/audit/${encodeURIComponent(row.original.id)}`}
          className="rounded border border-cyan-400/25 bg-cyan-400/8 px-2 py-0.5 text-[11px] text-cyan-100 hover:bg-cyan-400/18 transition-colors whitespace-nowrap"
        >
          Deep dive
        </Link>
      ),
    },
  ];
}

export default function AuditIndexTable({ rows, runFolder }: AuditIndexTableProps) {
  const columns = makeColumns(runFolder);

  return (
    <DataTable
      columns={columns}
      data={rows}
      title="Audit index"
      fileName="audit-index.csv"
      searchPlaceholder="Search audits..."
      defaultPageSize={25}
      compact
    />
  );
}
