'use client';

import { useRef, useState, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Plotly is browser-only – never evaluated during SSR
const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

async function downloadPlotImage(graphDiv, filename) {
  if (!graphDiv) return;
  const mod = await import('plotly.js-dist-min');
  const Plotly = mod.default ?? mod;
  await Plotly.downloadImage(graphDiv, { format: 'png', filename });
}

/** Dark-themed Plotly layout defaults to merge with per-chart overrides. */
export const DARK_LAYOUT = {
  paper_bgcolor: 'rgba(0,0,0,0)',
  plot_bgcolor: 'rgba(13,22,44,0.5)',
  font: { color: '#b8d0f0', size: 11 },
  colorway: ['#22d3ee', '#2dd4bf', '#38bdf8', '#60a5fa', '#f59e0b', '#f472b6', '#a78bfa', '#34d399'],
  legend: {
    bgcolor: 'rgba(8,15,30,0.7)',
    bordercolor: 'rgba(148,163,184,0.15)',
    borderwidth: 1,
    font: { size: 11 },
  },
  margin: { t: 20, r: 16, l: 56, b: 56 },
  xaxis: {
    gridcolor: 'rgba(148,163,184,0.1)',
    linecolor: 'rgba(148,163,184,0.15)',
    tickcolor: 'rgba(148,163,184,0.3)',
    zerolinecolor: 'rgba(148,163,184,0.15)',
    automargin: true,
  },
  yaxis: {
    gridcolor: 'rgba(148,163,184,0.1)',
    linecolor: 'rgba(148,163,184,0.15)',
    tickcolor: 'rgba(148,163,184,0.3)',
    zerolinecolor: 'rgba(148,163,184,0.15)',
    automargin: true,
  },
  hovermode: 'closest',
  hoverlabel: {
    bgcolor: 'rgba(8,15,30,0.97)',
    bordercolor: 'rgba(34,211,238,0.4)',
    font: { color: '#e2ecfd', size: 11 },
  },
};

/** Shared Plotly config. Pass modeBarExtra to add extra buttons. */
export const PLOT_CONFIG = {
  responsive: true,
  displaylogo: false,
  scrollZoom: true,
  modeBarButtonsToRemove: ['toImage'],
};

type PlotCardProps = {
  eyebrow?: ReactNode;
  title?: ReactNode;
  controls?: ReactNode;
  data?: any[];
  layout?: Record<string, any>;
  config?: Record<string, any>;
  height?: string;
  exportName?: string;
  onSelected?: (event: any) => void;
  onClick?: (event: any) => void;
  onDeselect?: () => void;
  onDoubleClick?: () => void;
  onSelectionStateChange?: (hasSelection: boolean) => void;
  scrollX?: boolean;
  minWidthPx?: number;
  className?: string;
  id?: string;
  fillHeight?: boolean;
  maxPoints?: number;
};

function downsampleIndices(length: number, maxPoints: number): number[] {
  if (length <= maxPoints) return Array.from({ length }, (_, index) => index);
  const step = (length - 1) / (maxPoints - 1);
  const indices = new Set<number>([0, length - 1]);
  for (let sample = 1; sample < maxPoints - 1; sample += 1) {
    indices.add(Math.round(sample * step));
  }
  return [...indices].sort((left, right) => left - right);
}

function pickByIndices<T>(input: T[] | undefined, indices: number[]): T[] | undefined {
  if (!Array.isArray(input)) return input;
  return indices.map((index) => input[index]);
}

function applyPointBudget(traces: any[], maxPoints: number): any[] {
  return traces.map((trace) => {
    const traceType = String(trace?.type ?? 'scatter');
    if (traceType === 'heatmap') return trace;

    const xValues = Array.isArray(trace?.x) ? trace.x : null;
    const yValues = Array.isArray(trace?.y) ? trace.y : null;
    const length = Math.max(xValues?.length ?? 0, yValues?.length ?? 0);
    if (!length || length <= maxPoints) return trace;

    const indices = downsampleIndices(length, maxPoints);
    return {
      ...trace,
      x: pickByIndices(xValues ?? undefined, indices),
      y: pickByIndices(yValues ?? undefined, indices),
      text: pickByIndices(Array.isArray(trace?.text) ? trace.text : undefined, indices),
      hovertext: pickByIndices(Array.isArray(trace?.hovertext) ? trace.hovertext : undefined, indices),
      customdata: pickByIndices(Array.isArray(trace?.customdata) ? trace.customdata : undefined, indices),
      mode: traceType === 'scatter' ? 'lines+markers' : trace.mode,
    };
  });
}

/**
 * PlotCard – reusable chart card shell.
 *
 * Props:
 *   eyebrow     – small uppercase label above the title
 *   title       – card heading
 *   controls    – ReactNode rendered in the header right slot (selects, buttons)
 *   data        – Plotly data array
 *   layout      – Plotly layout object (merged with DARK_LAYOUT)
 *   config      – Plotly config overrides (merged with PLOT_CONFIG)
 *   height      – chart height string, e.g. "360px"
 *   exportName  – PNG filename (no extension)
 *   onSelected  – Plotly onSelected callback
 *   onClick     – Plotly onClick callback
 *   onDeselect  – Plotly onDeselect callback
 *   className   – additional classes on the section wrapper
 *   id          – section id attribute
 */
export default function PlotCard({
  eyebrow,
  title,
  controls,
  data = [],
  layout = {},
  config = {},
  height = '360px',
  exportName = 'chart',
  onSelected,
  onClick,
  onDeselect,
  onDoubleClick,
  onSelectionStateChange,
  scrollX = false,
  minWidthPx = 0,
  className,
  id,
  fillHeight = false,
  maxPoints = 2500,
}: PlotCardProps) {
  const graphDivRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const mergedLayout = {
    ...DARK_LAYOUT,
    ...layout,
    xaxis: { ...DARK_LAYOUT.xaxis, ...(layout.xaxis ?? {}) },
    yaxis: { ...DARK_LAYOUT.yaxis, ...(layout.yaxis ?? {}) },
    legend: { ...DARK_LAYOUT.legend, ...(layout.legend ?? {}) },
    hoverlabel: { ...DARK_LAYOUT.hoverlabel, ...(layout.hoverlabel ?? {}) },
    margin: { ...DARK_LAYOUT.margin, ...(layout.margin ?? {}) },
  };

  const mergedConfig = { ...PLOT_CONFIG, ...config };
  const boundedData = maxPoints && maxPoints > 2 ? applyPointBudget(data, maxPoints) : data;
  const ariaLabel = typeof title === 'string' ? title : 'Chart';

  function hasPlotSelection(div: any): boolean {
    const traces = Array.isArray(div?.data) ? div.data : [];
    return traces.some((trace: any) => Array.isArray(trace?.selectedpoints) && trace.selectedpoints.length > 0);
  }

  function notifySelectionState() {
    if (!onSelectionStateChange) return;
    requestAnimationFrame(() => {
      onSelectionStateChange(hasPlotSelection(graphDivRef.current));
    });
  }

  return (
    <section
      id={id}
      className={cn(
        'rounded-xl border border-white/8 bg-card p-4',
        fillHeight && 'flex min-h-0 flex-col',
        className
      )}
      aria-labelledby={id ? `${id}-title` : undefined}
    >
      {/* Card header */}
      {(eyebrow || title || controls) && (
        <div className="mb-4 space-y-3">
          <div className="min-w-0">
            {eyebrow && (
              <p className="text-[10px] uppercase tracking-[0.26em] text-cyan-300/60 mb-0.5">{eyebrow}</p>
            )}
            {title && (
              <h2 id={id ? `${id}-title` : undefined} className="text-sm font-semibold text-foreground leading-snug">
                {title}
              </h2>
            )}
          </div>
          {(controls || exportName) && (
            <div className="flex flex-wrap items-center gap-2">
              {controls}
              {exportName && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1.5 border-white/10 bg-transparent text-muted-foreground hover:text-foreground hover:bg-white/8 text-xs"
                  onClick={() => downloadPlotImage(graphDivRef.current, exportName)}
                  aria-label="Export chart as PNG"
                >
                  <Download className="h-3 w-3" />
                  <span className="hidden sm:inline">PNG</span>
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Chart */}
      <div className={cn(scrollX ? 'overflow-x-auto' : '', fillHeight && 'min-h-0 flex-1')}>
        <div
          className={cn('relative', fillHeight && 'h-full min-h-0')}
          role="img"
          aria-label={ariaLabel}
          style={{ minHeight: height, minWidth: scrollX && minWidthPx ? `${minWidthPx}px` : undefined }}
        >
          {isLoading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-card/70" role="status" aria-live="polite">
              <span className="flex flex-col items-center gap-3 text-xs text-muted-foreground">
                <span className="h-7 w-7 animate-spin rounded-full border-2 border-cyan-300/20 border-t-cyan-300" aria-hidden="true" />
                Loading graph
              </span>
            </div>
          )}
          <Plot
            data={boundedData}
            layout={mergedLayout}
            config={mergedConfig}
            style={{ width: '100%', height: fillHeight ? '100%' : height }}
            useResizeHandler={!scrollX}
            onInitialized={(_, div: any) => { graphDivRef.current = div; setIsLoading(false); }}
            onUpdate={(_, div: any) => { graphDivRef.current = div; setIsLoading(false); }}
            onSelected={(event) => {
              onSelected?.(event);
              notifySelectionState();
            }}
            onClick={(event) => {
              onClick?.(event);
              notifySelectionState();
            }}
            onDeselect={() => {
              onDeselect?.();
              notifySelectionState();
            }}
            onDoubleClick={() => {
              onDoubleClick?.();
              notifySelectionState();
            }}
          />
        </div>
      </div>
    </section>
  );
}
