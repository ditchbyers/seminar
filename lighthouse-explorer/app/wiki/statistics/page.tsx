type StatRow = [string, string, string];

const STATS: StatRow[] = [
  ['n', 'Sample size', 'The number of observations included after applying the current filters. Small sample sizes can make any summary statistic unstable.'],
  ['Mean', 'Arithmetic average', 'Simple and intuitive but sensitive to skew and extreme values. Can be misleading when a few unusually slow iterations occur.'],
  ['Median', 'Middle value', 'The middle observation after sorting. Robust against outliers and therefore a better central tendency measure for noisy Lighthouse data.'],
  ['Std Dev', 'Spread (n − 1)', 'Sample standard deviation. Estimates how much observations vary around the mean and is useful for discussing volatility.'],
  ['IQR', 'Q3 − Q1', 'The interquartile range captures the central 50 % of the data. One of the best summary measures when values contain outliers.'],
  ['p90', '90th percentile', 'Tail-focused measure identifying the experience at the slower end of the distribution without being as extreme as the maximum.'],
  ['p95', '95th percentile', 'Stricter tail metric than p90. Useful for discussing near-worst-case behavior.'],
  ['Min / Max', 'Observed extremes', 'The absolute lower and upper bounds. Informative but a single abnormal run can dominate these values.'],
];

const GUIDANCE: string[] = [
  'Use median and IQR for cross-framework ranking under variable runtime noise.',
  'Use p90 / p95 when evaluating worst-case user experience and tail regressions.',
  'Compare the same platform preset and route before drawing framework conclusions.',
  'Prefer run-to-run trend analysis over single-run absolute values.',
];

const FORMULAS: Array<[string, string, string]> = [
  ['Sample mean', 'x̄ = (1 / n) Σ xᵢ', 'Central tendency sensitive to outliers; report with spread.'],
  ['Sample standard deviation', 's = sqrt((1 / (n - 1)) Σ (xᵢ - x̄)^2)', 'Use n-1 for unbiased sample variance estimate.'],
  ['Median', 'Q₂ = percentile(x, 0.50)', 'Robust center for skewed distributions.'],
  ['Interquartile range', 'IQR = Q₃ - Q₁', 'Robust spread of middle 50% of observations.'],
  ['Relative regression gap', 'Δ% = ((observed - baseline) / baseline) * 100', 'Use sign and metric direction carefully (higher-better vs lower-better).'],
];

const INFERENCE_RULES: string[] = [
  'Do not claim superiority from overlapping distributions without interval evidence.',
  'For small n, emphasize effect size and consistency over binary significance language.',
  'When metrics disagree (for example better score but worse p95), discuss trade-offs explicitly.',
  'Report baseline definition before presenting regression percentages.',
];

export default function WikiStatisticsPage() {
  return (
    <div className="space-y-5 min-w-0">
      {/* Header */}
      <section className="rounded-xl border border-white/8 bg-card p-5">
        <p className="text-[10px] uppercase tracking-[0.3em] text-cyan-300/60">Knowledge Base</p>
        <h1 className="mt-1.5 text-2xl font-semibold text-foreground">Statistical Values</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
          Repeated Lighthouse measurements are naturally noisy because rendering, CPU scheduling, caching, and network
          effects can vary across runs. The dashboard emphasizes summary statistics that remain meaningful under small
          irregularities and allows inspection of the full distribution when more detail is needed.
        </p>
      </section>

      {/* Why these stats */}
      <section className="rounded-xl border border-cyan-400/15 bg-cyan-400/5 p-5">
        <h2 className="text-sm font-semibold text-cyan-100">Why these statistics are used</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          In a university project, the goal is not only to report numbers but to justify why those numbers represent
          the underlying behavior. The median and IQR are preferred for ranking because they resist outliers. The mean
          and standard deviation remain useful for discussing average behavior and spread, but they should be paired
          with percentiles when the distribution is skewed. Tail metrics such as p90 and p95 are especially important
          when the evaluation focuses on worst-case user experience.
        </p>
      </section>

      {/* Stats table */}
      <section className="rounded-xl border border-white/8 bg-card p-5">
        <h2 className="text-sm font-semibold text-foreground mb-4">Glossary</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-xs">
            <thead>
              <tr className="border-b border-white/8">
                <th className="py-2.5 px-3 text-left text-muted-foreground font-medium w-24 whitespace-nowrap">Term</th>
                <th className="py-2.5 px-3 text-left text-muted-foreground font-medium w-36 whitespace-nowrap">Short name</th>
                <th className="py-2.5 px-3 text-left text-muted-foreground font-medium">Explanation</th>
              </tr>
            </thead>
            <tbody>
              {STATS.map(([term, short, explanation]) => (
                <tr key={term} className="border-b border-white/5 align-top">
                  <td className="py-2.5 px-3 text-foreground font-medium font-mono whitespace-nowrap">{term}</td>
                  <td className="py-2.5 px-3 text-muted-foreground whitespace-nowrap">{short}</td>
                  <td className="py-2.5 px-3 text-muted-foreground leading-relaxed">{explanation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Guidance */}
      <section className="rounded-xl border border-white/8 bg-card p-5">
        <h2 className="text-sm font-semibold text-foreground mb-3">Interpretation guidance</h2>
        <ul className="space-y-2">
          {GUIDANCE.map((point) => (
            <li key={point} className="flex items-start gap-2.5 text-sm text-muted-foreground">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400/60" />
              {point}
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-white/8 bg-card p-5">
        <h2 className="text-sm font-semibold text-foreground mb-4">Core formulas used in reporting</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-xs">
            <thead>
              <tr className="border-b border-white/8">
                <th className="py-2.5 px-3 text-left text-muted-foreground font-medium w-48 whitespace-nowrap">Concept</th>
                <th className="py-2.5 px-3 text-left text-muted-foreground font-medium w-72 whitespace-nowrap">Formula</th>
                <th className="py-2.5 px-3 text-left text-muted-foreground font-medium">Interpretation note</th>
              </tr>
            </thead>
            <tbody>
              {FORMULAS.map(([concept, formula, note]) => (
                <tr key={concept} className="border-b border-white/5 align-top">
                  <td className="py-2.5 px-3 text-foreground font-medium whitespace-nowrap">{concept}</td>
                  <td className="py-2.5 px-3 text-cyan-200/85 font-mono whitespace-nowrap">{formula}</td>
                  <td className="py-2.5 px-3 text-muted-foreground leading-relaxed">{note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-cyan-400/15 bg-cyan-400/5 p-5">
        <h2 className="text-sm font-semibold text-cyan-100 mb-3">Inference guardrails for academic writing</h2>
        <ul className="space-y-2">
          {INFERENCE_RULES.map((rule) => (
            <li key={rule} className="flex items-start gap-2.5 text-sm text-muted-foreground">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-300/70" />
              {rule}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
