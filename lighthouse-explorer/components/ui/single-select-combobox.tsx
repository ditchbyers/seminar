'use client';

import { Check, ChevronsUpDown } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { type ComboboxOption } from '@/components/ui/multi-select-combobox';

type SingleSelectComboboxProps = {
  options: ComboboxOption[];
  selected?: string;
  onChange: (next: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  triggerClassName?: string;
};

export function SingleSelectCombobox({
  options,
  selected,
  onChange,
  placeholder = 'Select...',
  searchPlaceholder = 'Search...',
  className,
  triggerClassName,
}: SingleSelectComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filteredOptions = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return options;
    return options.filter((option) => option.label.toLowerCase().includes(term));
  }, [options, search]);

  const selectedLabel = selected
    ? options.find((option) => option.value === selected)?.label ?? selected
    : placeholder;

  function selectValue(value: string) {
    onChange(value);
    setOpen(false);
  }

  return (
    <DropdownMenu
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setSearch('');
      }}
    >
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex h-7 w-full items-center justify-between gap-1.5 rounded-md border border-white/12 bg-white/5 px-2 text-xs text-foreground transition-colors hover:border-cyan-400/30 focus:outline-none focus:ring-2 focus:ring-cyan-400/50',
            triggerClassName
          )}
        >
          <span className={cn('truncate', !selected && 'text-muted-foreground')}>{selectedLabel}</span>
          <ChevronsUpDown className="h-3 w-3 shrink-0 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        className={cn('w-64 max-h-80 overflow-hidden border-white/10 bg-popover p-0 text-xs', className)}
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
          {filteredOptions.length === 0 && (
            <p className="px-2 py-3 text-center text-[11px] text-muted-foreground">No matches</p>
          )}

          {filteredOptions.map((option) => (
            <DropdownMenuItem
              key={option.value}
              inset={undefined}
              onSelect={(event) => {
                event.preventDefault();
                selectValue(option.value);
              }}
              className="flex items-center justify-between text-xs focus:bg-white/8"
            >
              <span>{option.label}</span>
              {selected === option.value && <Check className="h-3.5 w-3.5 text-cyan-300" />}
            </DropdownMenuItem>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
