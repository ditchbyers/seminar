type MetricRow = [string, string, 'Higher' | 'Lower' | 'N/A', string];

const METRICS: MetricRow[] = [
  ['Performance Score', '[0–100] %', 'Higher', 'A composite Lighthouse score summarising speed-related audits. Shown as a percentage but should be treated as a normalized score rather than a literal percentage of performance.'],
  ['FCP (First Contentful Paint)', 'ms', 'Lower', 'Time until the browser renders the first text or image content. Captures how quickly the page gives the user visible feedback.'],
  ['LCP (Largest Contentful Paint)', 'ms', 'Lower', 'Time until the largest visible content element is rendered. Approximates when the main content becomes useful — one of the most important user-centric loading metrics.'],
  ['TBT (Total Blocking Time)', 'ms', 'Lower', 'Main-thread blocking time between FCP and Time to Interactive. Lower values indicate less JavaScript contention and better input responsiveness.'],
  ['Speed Index', 'ms', 'Lower', 'Visual progress metric estimating how fast the visible portion of the page is populated during load.'],
  ['CLS (Cumulative Layout Shift)', 'unitless', 'Lower', 'Layout stability score measuring unexpected visual movement during load. Values near zero indicate a stable, non-disorienting experience.'],
  ['Accessibility', '[0–100] %', 'Higher', 'Normalized score derived from Lighthouse accessibility audits. A high score indicates fewer detected violations but does not guarantee full WCAG compliance.'],
  ['Best Practices', '[0–100] %', 'Higher', 'Implementation quality, security-related practices, and browser compatibility checks. Read as a diagnostic quality indicator, not a formal security audit.'],
  ['SEO', '[0–100] %', 'Higher', 'Common search-engine discoverability checks measuring baseline technical SEO readiness.'],
  ['Failed Audits', 'count', 'Lower', 'Count of scored audits that did not pass their threshold. A higher count means more actionable optimization work remains.'],
  ['Insight Audits', 'count', 'N/A', 'Count of insight-oriented audits in the report. These provide analytical context rather than flagging failures.'],
  ['Diagnostics Items', 'count', 'Lower', 'Count of diagnostics detail items in the Lighthouse JSON. Important for root-cause analysis when scores change unexpectedly.'],
];

const METRIC_GROUPS: Array<{ title: string; description: string; metrics: string[] }> = [
  {
    title: 'Outcome metrics',
    description: 'High-level results used for cross-framework ranking and headline conclusions.',
    metrics: ['Performance Score', 'LCP (Largest Contentful Paint)', 'FCP (First Contentful Paint)', 'CLS (Cumulative Layout Shift)'],
  },
  {
    title: 'Mechanism metrics',
    description: 'Explanatory signals indicating rendering and main-thread pressure behind outcome changes.',
    metrics: ['TBT (Total Blocking Time)', 'Speed Index', 'Failed Audits', 'Diagnostics Items'],
  },
  {
    title: 'Quality envelope metrics',
    description: 'Non-performance category scores that support quality discussion and trade-off analysis.',
    metrics: ['Accessibility', 'Best Practices', 'SEO'],
  },
];

const ANTI_PATTERNS = [
  'Using only Lighthouse Performance Score to claim one framework is globally best.',
  'Comparing desktop and mobile preset values directly without preset normalization.',
  'Ignoring route-level differences and averaging across heterogeneous content patterns.',
  'Explaining load-test degradation without checking audit-level render-blocking or main-thread signals.',
];

export default function WikiMetricsPage() {
  return (
    <div className="space-y-5 min-w-0">
      {/* Header */}
      <section className="rounded-xl border border-white/8 bg-card p-5">
        <p className="text-[10px] uppercase tracking-[0.3em] text-cyan-300/60">Knowledge Base</p>
        <h1 className="mt-1.5 text-2xl font-semibold text-foreground">Metrics Reference</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
          The dashboard combines summary CSV fields with values extracted from raw Lighthouse JSON. Each metric below
          includes its unit, preferred direction, and the analytical role it plays in benchmark interpretation.
        </p>
      </section>

      {/* Academic interpretation guidance */}
      <section className="rounded-xl border border-cyan-400/15 bg-cyan-400/5 p-5">
        <h2 className="text-sm font-semibold text-cyan-100">Interpreting metrics in a thesis</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Avoid comparing only raw score values. Use each metric definition together with the route, platform, and
          iteration scope. A framework with slightly worse performance score but much better CLS may provide a more
          stable user experience. The dashboard is designed to help identify those trade-offs, not just to rank a
          single number.
        </p>
      </section>

      {/* Metrics table */}
      <section className="rounded-xl border border-white/8 bg-card p-5">
        <h2 className="text-sm font-semibold text-foreground mb-4">All Metrics</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-xs">
            <thead>
              <tr className="border-b border-white/8">
                <th className="py-2.5 px-3 text-left text-muted-foreground font-medium w-44 whitespace-nowrap">Metric</th>
                <th className="py-2.5 px-3 text-left text-muted-foreground font-medium w-24 whitespace-nowrap">Unit</th>
                <th className="py-2.5 px-3 text-left text-muted-foreground font-medium w-20 whitespace-nowrap">Direction</th>
                <th className="py-2.5 px-3 text-left text-muted-foreground font-medium">Definition</th>
              </tr>
            </thead>
            <tbody>
              {METRICS.map(([name, unit, direction, definition]) => (
                <tr key={name} className="border-b border-white/5 align-top">
                  <td className="py-2.5 px-3 text-foreground font-medium whitespace-nowrap">{name}</td>
                  <td className="py-2.5 px-3 text-muted-foreground font-mono whitespace-nowrap">{unit}</td>
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <span className={`text-[10px] font-medium uppercase tracking-[0.15em] ${
                      direction === 'Higher' ? 'text-emerald-400' :
                      direction === 'Lower' ? 'text-cyan-400' : 'text-muted-foreground'
                    }`}>
                      {direction}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-muted-foreground leading-relaxed">{definition}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-white/8 bg-card p-5">
        <h2 className="text-sm font-semibold text-foreground mb-4">Metric families for interpretation</h2>
        <div className="grid gap-3 md:grid-cols-3">
          {METRIC_GROUPS.map((group) => (
            <article key={group.title} className="rounded-lg border border-white/8 bg-card/70 p-4">
              <h3 className="text-xs font-semibold text-foreground uppercase tracking-[0.16em]">{group.title}</h3>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{group.description}</p>
              <ul className="mt-3 space-y-1.5">
                {group.metrics.map((metric) => (
                  <li key={metric} className="text-xs text-foreground/90">{metric}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-cyan-400/15 bg-cyan-400/5 p-5">
        <h2 className="text-sm font-semibold text-cyan-100 mb-3">Common interpretation anti-patterns</h2>
        <ul className="space-y-2">
          {ANTI_PATTERNS.map((pattern) => (
            <li key={pattern} className="flex items-start gap-2.5 text-sm text-muted-foreground">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-300/70" />
              {pattern}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
