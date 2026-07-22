'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, Download, Search, SlidersHorizontal, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

function exportRowsAsCsv(filename, rows, columns) {
  if (!rows.length) return;
  const exportableColumns = columns.filter((col) => col.accessorKey && col.accessorKey !== 'action');
  const headers = exportableColumns.map((col) => col.header || col.accessorKey);
  const csvLines = [headers.join(',')];
  for (const row of rows) {
    const values = exportableColumns.map((col) => {
      const raw = row.original?.[col.accessorKey] ?? row[col.accessorKey] ?? '';
      const value = String(raw);
      return /[",\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
    });
    csvLines.push(values.join(','));
  }
  const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

/**
 * Reusable DataTable powered by TanStack React Table + shadcn Table primitives.
 *
 * columns: TanStack column definitions array
 * data: row data array
 * fileName: CSV export filename
 * title: optional section title
 * searchPlaceholder: placeholder text for the global filter input
 * defaultPageSize: initial rows per page (default 10)
 * compact: smaller row padding mode
 */
export default function DataTable({
  columns,
  data,
  fileName = 'export.csv',
  title,
  searchPlaceholder = 'Search...',
  defaultPageSize = 10,
  compact = false,
  filterableColumns = [],
}) {
  const tableContainerRef = useRef(null);
  const [sorting, setSorting] = useState([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [columnFilters, setColumnFilters] = useState([]);
  const [columnValueSearch, setColumnValueSearch] = useState({});
  const [columnVisibility, setColumnVisibility] = useState({});
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: defaultPageSize });
  const [openColumnMenuId, setOpenColumnMenuId] = useState(null);

  const columnTypes = useMemo(() => {
    const types = {};
    for (const column of columns) {
      if (!column?.accessorKey || column.accessorKey === 'action') continue;
      const sample = data.find((row) => row?.[column.accessorKey] !== null && row?.[column.accessorKey] !== undefined)?.[column.accessorKey];
      types[column.accessorKey] = typeof sample === 'number' ? 'number' : 'text';
    }
    return types;
  }, [columns, data]);

  const enhancedColumns = useMemo(() => columns.map((column) => {
    if (!column?.accessorKey || column.accessorKey === 'action') return column;
    const type = columnTypes[column.accessorKey] ?? 'text';
    return {
      ...column,
      filterFn: type === 'number' ? 'numberRange' : 'multiValue',
      enableColumnFilter: true,
    };
  }), [columns, columnTypes]);

  const filterableColumnIds = useMemo(() => new Set(
    enhancedColumns
      .filter((column) => Boolean(column?.accessorKey) && column.accessorKey !== 'action')
      .map((column) => String(column.accessorKey))
  ), [enhancedColumns]);

  // Reset page when data or filter changes
  useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [data, globalFilter, columnFilters]);

  const table = useReactTable({
    data,
    columns: enhancedColumns,
    state: { sorting, globalFilter, columnFilters, columnVisibility, pagination },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    filterFns: {
      multiValue: (row, columnId, filterValue) => {
        if (!Array.isArray(filterValue) || !filterValue.length) return true;
        return filterValue.includes(String(row.getValue(columnId) ?? ''));
      },
      numberRange: (row, columnId, filterValue) => {
        if (!filterValue || (filterValue.min === '' && filterValue.max === '')) return true;
        const numeric = Number(row.getValue(columnId));
        if (!Number.isFinite(numeric)) return false;
        const min = filterValue.min === '' ? null : Number(filterValue.min);
        const max = filterValue.max === '' ? null : Number(filterValue.max);
        if (min !== null && Number.isFinite(min) && numeric < min) return false;
        if (max !== null && Number.isFinite(max) && numeric > max) return false;
        return true;
      },
    },
    manualPagination: false,
  });

  const { pageIndex, pageSize } = table.getState().pagination;
  const totalRows = table.getFilteredRowModel().rows.length;
  const pageCount = table.getPageCount();
  const startRow = pageIndex * pageSize + 1;
  const endRow = Math.min((pageIndex + 1) * pageSize, totalRows);

  return (
    <div ref={tableContainerRef} className="flex flex-col gap-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {title && (
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        )}
        <div className={cn('flex flex-wrap items-center gap-2', !title && 'ml-auto')}>
          {/* Global search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              placeholder={searchPlaceholder}
              value={globalFilter ?? ''}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="h-8 w-48 pl-8 bg-card border-white/10 text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-cyan-400/50"
            />
          </div>

          {/* Column visibility */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 border-white/10 bg-card text-foreground hover:bg-white/8 hover:text-foreground text-xs"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                <span className="sr-only sm:not-sr-only">Columns</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-popover border-white/10 text-popover-foreground min-w-40 max-h-72 overflow-auto">
              {table
                .getAllColumns()
                .filter((col) => col.getCanHide())
                .map((col) => (
                  <DropdownMenuCheckboxItem
                    key={col.id}
                    className="capitalize text-xs focus:bg-white/8"
                    checked={col.getIsVisible()}
                    onCheckedChange={(value) => col.toggleVisibility(!!value)}
                  >
                    {col.columnDef.header ?? col.id}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Export CSV */}
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 border-white/10 bg-card text-foreground hover:bg-white/8 hover:text-foreground text-xs"
            onClick={() => exportRowsAsCsv(fileName, table.getFilteredRowModel().rows, columns)}
          >
            <Download className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only">Export CSV</span>
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-white/8 overflow-x-auto">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="border-white/8 hover:bg-transparent">
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const sorted = header.column.getIsSorted();
                  const column = header.column;
                  const canColumnFilter = filterableColumnIds.has(column.id);
                  const columnType = canColumnFilter ? (columnTypes[column.id] ?? 'text') : 'text';
                  const filterValue = canColumnFilter ? column.getFilterValue() : undefined;
                  type NumericRangeFilter = { min?: string | number; max?: string | number };
                  const numericFilter = !Array.isArray(filterValue) && filterValue && typeof filterValue === 'object'
                    ? (filterValue as NumericRangeFilter)
                    : undefined;
                  const hasFilter = canColumnFilter && (
                    Array.isArray(filterValue)
                      ? filterValue.length > 0
                      : Boolean(numericFilter && (numericFilter.min !== '' || numericFilter.max !== ''))
                  );
                  const optionSearch = columnValueSearch[header.column.id] ?? '';
                  const allOptions = canColumnFilter
                    ? [...column.getFacetedUniqueValues().keys()].map((value) => String(value)).sort((left, right) => left.localeCompare(right))
                    : [];
                  const filteredOptions = columnType === 'text'
                    ? allOptions.filter((option) => option.toLowerCase().includes(optionSearch.toLowerCase()))
                    : [];
                  const selectedTextValues = Array.isArray(filterValue) ? filterValue.map((entry) => String(entry)) : [];
                  return (
                    <TableHead
                      key={header.id}
                      className={cn(
                        'text-muted-foreground text-xs font-medium h-9 whitespace-nowrap',
                        compact ? 'px-3 py-1.5' : 'px-3 py-2',
                        canSort && 'select-none'
                      )}
                      aria-sort={sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : 'none'}
                    >
                      <DropdownMenu
                        open={openColumnMenuId === column.id}
                        onOpenChange={(open) => {
                          if (open) {
                            setOpenColumnMenuId(column.id);
                          } else if (openColumnMenuId === column.id) {
                            setOpenColumnMenuId(null);
                          }
                        }}
                      >
                        <DropdownMenuTrigger asChild>
                          <button type="button" className="flex items-center gap-1 hover:text-foreground">
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {canSort && (
                              <span className="shrink-0">
                                {sorted === 'asc' ? (
                                  <ArrowUp className="h-3 w-3 text-cyan-400" />
                                ) : sorted === 'desc' ? (
                                  <ArrowDown className="h-3 w-3 text-cyan-400" />
                                ) : (
                                  <ArrowUpDown className="h-3 w-3 opacity-30" />
                                )}
                              </span>
                            )}
                            {canColumnFilter && (
                              <Filter className={cn('h-3 w-3', hasFilter ? 'text-cyan-400' : 'opacity-30')} />
                            )}
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="start"
                          className="w-64 bg-popover border-white/10 text-popover-foreground"
                          onInteractOutside={(event) => {
                            const target = event.target;
                            if (target instanceof Node && tableContainerRef.current?.contains(target)) {
                              event.preventDefault();
                            }
                          }}
                        >
                          {canSort && (
                            <>
                              <p className="px-2 py-1 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Sort</p>
                              <DropdownMenuItem inset={false} className="text-xs focus:bg-white/8" onSelect={(event) => event.preventDefault()} onClick={() => column.toggleSorting(false)}>Ascending</DropdownMenuItem>
                              <DropdownMenuItem inset={false} className="text-xs focus:bg-white/8" onSelect={(event) => event.preventDefault()} onClick={() => column.toggleSorting(true)}>Descending</DropdownMenuItem>
                              <DropdownMenuItem inset={false} className="text-xs focus:bg-white/8" onSelect={(event) => event.preventDefault()} onClick={() => column.clearSorting()}>Clear sorting</DropdownMenuItem>
                            </>
                          )}

                          {canColumnFilter && (
                            <>
                              <DropdownMenuSeparator className="bg-white/10" />
                              <p className="px-2 py-1 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Filter</p>

                              {columnType === 'number' ? (
                                <div className="grid grid-cols-2 gap-2 px-2 pb-2">
                                  <Input
                                    type="number"
                                    placeholder="Min"
                                    value={(numericFilter?.min ?? '')}
                                    onChange={(event) => {
                                      const next = { min: event.target.value, max: numericFilter?.max ?? '' };
                                      column.setFilterValue(next.min === '' && next.max === '' ? undefined : next);
                                    }}
                                    className="h-7 border-white/10 bg-card text-xs"
                                  />
                                  <Input
                                    type="number"
                                    placeholder="Max"
                                    value={(numericFilter?.max ?? '')}
                                    onChange={(event) => {
                                      const next = { min: numericFilter?.min ?? '', max: event.target.value };
                                      column.setFilterValue(next.min === '' && next.max === '' ? undefined : next);
                                    }}
                                    className="h-7 border-white/10 bg-card text-xs"
                                  />
                                </div>
                              ) : (
                                <>
                                  <div className="px-2 pb-2">
                                    <Input
                                      placeholder="Search values..."
                                      value={optionSearch}
                                      onChange={(event) => setColumnValueSearch((current) => ({ ...current, [header.column.id]: event.target.value }))}
                                      className="h-7 border-white/10 bg-card text-xs"
                                    />
                                  </div>
                                  <div className="max-h-56 overflow-auto px-1">
                                    {filteredOptions.map((option) => (
                                      <DropdownMenuCheckboxItem
                                        inset={false}
                                        key={`${header.column.id}-${option}`}
                                        className="text-xs focus:bg-white/8"
                                        checked={selectedTextValues.includes(option)}
                                        onSelect={(event) => event.preventDefault()}
                                        onCheckedChange={(checked) => {
                                          const currentFilter = column.getFilterValue();
                                          const current = Array.isArray(currentFilter) ? currentFilter.map((entry) => String(entry)) : [];
                                          const next = checked
                                            ? [...current, option]
                                            : current.filter((value) => value !== option);
                                          column.setFilterValue(next.length ? next : undefined);
                                        }}
                                      >
                                        {option}
                                      </DropdownMenuCheckboxItem>
                                    ))}
                                  </div>
                                </>
                              )}

                              <DropdownMenuItem inset={false} className="text-xs focus:bg-white/8" onSelect={(event) => event.preventDefault()} onClick={() => column.setFilterValue(undefined)}>
                                Clear filter
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className={cn(
                    'border-white/5 align-top transition-colors hover:bg-white/3',
                    compact ? '' : ''
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={cn(
                        'text-foreground/85 text-xs',
                        compact ? 'px-3 py-1.5' : 'px-3 py-2.5'
                      )}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-20 text-center text-muted-foreground text-xs">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>
          {totalRows > 0
            ? `Showing ${startRow}–${endRow} of ${totalRows} row${totalRows !== 1 ? 's' : ''}`
            : 'No rows'}
        </span>
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline">Rows per page</span>
          <Select
            value={String(pageSize)}
            onValueChange={(value) =>
              table.setPagination({ pageIndex: 0, pageSize: Number(value) })
            }
          >
            <SelectTrigger className="h-7 w-16 border-white/10 bg-card text-xs text-foreground focus:ring-cyan-400/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover border-white/10 text-popover-foreground text-xs min-w-16">
              {[10, 25, 50, 100].map((size) => (
                <SelectItem key={size} value={String(size)} className="text-xs focus:bg-white/8">
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7 border-white/10 bg-card hover:bg-white/8 disabled:opacity-30"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span className="min-w-16 text-center">
              {pageCount > 0 ? `${pageIndex + 1} / ${pageCount}` : '—'}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7 border-white/10 bg-card hover:bg-white/8 disabled:opacity-30"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              aria-label="Next page"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
