import { PaginationRequest, SortDir } from './types';

function toFiniteNumber(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function parsePaginationQuery(query: Record<string, unknown>): PaginationRequest {
  const limit = Math.max(1, Math.min(500, Math.floor(toFiniteNumber(query.limit, 25))));
  const offset = Math.max(0, Math.floor(toFiniteNumber(query.offset, 0)));
  const search = typeof query.search === 'string' ? query.search.trim() : '';
  const sortBy = typeof query.sortBy === 'string' ? query.sortBy.trim() : '';
  const rawDir = typeof query.sortDir === 'string' ? query.sortDir.trim().toLowerCase() : 'asc';
  const sortDir: SortDir = rawDir === 'desc' ? 'desc' : 'asc';

  return { limit, offset, search, sortBy, sortDir };
}

function cmp(left: unknown, right: unknown): number {
  if (left == null && right == null) return 0;
  if (left == null) return -1;
  if (right == null) return 1;

  if (typeof left === 'number' && typeof right === 'number') {
    return left - right;
  }

  return String(left).localeCompare(String(right));
}

export function paginateRows<T extends Record<string, unknown>>(
  rows: T[],
  pagination: PaginationRequest,
  searchFields: (keyof T)[]
): { data: T[]; total: number; limit: number; offset: number } {
  let filtered = rows;

  if (pagination.search) {
    const needle = pagination.search.toLowerCase();
    filtered = rows.filter((row) =>
      searchFields.some((field) => String(row[field] ?? '').toLowerCase().includes(needle))
    );
  }

  if (pagination.sortBy) {
    const key = pagination.sortBy as keyof T;
    filtered = [...filtered].sort((a, b) => {
      const result = cmp(a[key], b[key]);
      return pagination.sortDir === 'desc' ? -result : result;
    });
  }

  const total = filtered.length;
  const data = filtered.slice(pagination.offset, pagination.offset + pagination.limit);

  return {
    data,
    total,
    limit: pagination.limit,
    offset: pagination.offset,
  };
}
