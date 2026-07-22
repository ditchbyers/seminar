'use client';

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

export default function HomepageAuditIndexTable({ rows, onSelectAudit }: { rows: AuditIndexRow[]; onSelectAudit?: (auditId: string) => void }) {
  const columns = [
    {
      accessorKey: 'title',
      header: 'Audit',
      enableSorting: true,
      cell: ({ row }: { row: { original: AuditIndexRow } }) => (
        <div>
          <p className="text-foreground/90">{row.original.title}</p>
          <p className="mt-0.5 text-[10px] text-muted-foreground/60">{row.original.id}</p>
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
      cell: ({ getValue }: { getValue: () => number }) => {
        const value = getValue();
        return <span className={value > 0 ? 'font-medium text-rose-400' : 'text-muted-foreground'}>{value}</span>;
      },
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
        <button
          type="button"
          onClick={() => onSelectAudit?.(row.original.id)}
          className="whitespace-nowrap rounded border border-cyan-400/25 bg-cyan-400/8 px-2 py-0.5 text-[11px] text-cyan-100 transition-colors hover:bg-cyan-400/18"
        >
          Analyze in audit tab
        </button>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={rows}
      title="Audit index"
      fileName="audit-index-home.csv"
      searchPlaceholder="Search audits..."
      defaultPageSize={25}
      compact
    />
  );
}
