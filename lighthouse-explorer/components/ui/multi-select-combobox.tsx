'use client';

import { useMemo, useState } from 'react';
import { ChevronsUpDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export type ComboboxOption = { value: string; label: string };

type MultiSelectComboboxProps = {
  options: ComboboxOption[];
  selected: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  triggerClassName?: string;
};

/** Compact multiselect combobox built on the existing dropdown-menu primitives (no extra deps). */
export function MultiSelectCombobox({
  options,
  selected,
  onChange,
  placeholder = 'All',
  searchPlaceholder = 'Search...',
  className,
  triggerClassName,
}: MultiSelectComboboxProps) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);

  const filteredOptions = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return options;
    return options.filter((option) => option.label.toLowerCase().includes(term));
  }, [options, search]);

  function toggle(value: string) {
    onChange(selected.includes(value) ? selected.filter((entry) => entry !== value) : [...selected, value]);
  }

  const summary = selected.length === 0
    ? placeholder
    : selected.length === 1
      ? options.find((option) => option.value === selected[0])?.label ?? selected[0]
      : `${selected.length} selected`;

  return (
    <DropdownMenu open={open} onOpenChange={(next) => { setOpen(next); if (!next) setSearch(''); }}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex h-7 w-full items-center justify-between gap-1.5 rounded-md border border-white/12 bg-white/5 px-2 text-xs text-foreground transition-colors hover:border-cyan-400/30 focus:outline-none focus:ring-2 focus:ring-cyan-400/50',
            triggerClassName
          )}
        >
          <span className={cn('truncate', selected.length === 0 && 'text-muted-foreground')}>{summary}</span>
          <ChevronsUpDown className="h-3 w-3 shrink-0 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className={cn('w-64 max-h-80 overflow-hidden bg-popover border-white/10 p-0 text-xs', className)}
      >
        <div className="border-b border-white/10 p-1.5">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => event.stopPropagation()}
            placeholder={searchPlaceholder}
            className="h-7 border-white/10 bg-card text-xs"
          />
        </div>
        <div className="max-h-60 overflow-y-auto p-1">
          {selected.length > 0 && (
            <DropdownMenuItem
              inset={undefined}
              onSelect={(event) => { event.preventDefault(); onChange([]); }}
              className="text-xs text-cyan-200/90 focus:bg-white/8"
            >
              Clear selection
            </DropdownMenuItem>
          )}
          {filteredOptions.length === 0 && (
            <p className="px-2 py-3 text-center text-[11px] text-muted-foreground">No matches</p>
          )}
          {filteredOptions.map((option) => (
            <DropdownMenuCheckboxItem
              key={option.value}
              checked={selected.includes(option.value)}
              onSelect={(event) => event.preventDefault()}
              onCheckedChange={() => toggle(option.value)}
              className="text-xs focus:bg-white/8"
            >
              {option.label}
            </DropdownMenuCheckboxItem>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
