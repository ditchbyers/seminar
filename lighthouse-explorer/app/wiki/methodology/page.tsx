type MethodologySection = {
  title: string;
  points: string[];
};

const SECTIONS: MethodologySection[] = [
  {
    title: '1. Experimental objective and unit of analysis',
    points: [
      'Primary objective: compare framework variants under identical content routes and platform presets while preserving audit-level explainability.',
      'Unit of analysis: one Lighthouse execution row (framework-version, route, preset, iteration, runFolder).',
      'Secondary objective: relate synthetic quality metrics (Lighthouse) to load behavior (JMeter) without collapsing them into a single opaque score.',
    ],
  },
  {
    title: '2. Data provenance and evidence layers',
    points: [
      'Index layer: summary.csv in each run folder provides canonical run dimensions and top-level metrics.',
      'Evidence layer: per-iteration JSON reports provide category and audit-level diagnostics.',
      'Traceability principle: every chart/table result must be reproducible from rows and artifact paths exposed by the API.',
    ],
  },
  {
    title: '3. Scope control and comparability constraints',
    points: [
      'Comparisons are valid only when route and preset are matched (for example mobile-home vs mobile-home).',
      'Single-run mode is preferred for causality-oriented audit inspection; cross-run mode is preferred for trend/regression checks.',
      'Global filters define the active evidence subset and should always be reported in captions and appendix tables.',
    ],
  },
  {
    title: '4. Evaluation model',
    points: [
      'Descriptive layer: mean/median/p95 and distribution diagnostics per framework-route-preset group.',
      'Diagnostic layer: actionable audit index (performance/LCP/FCP relevance) with failure and savings signals.',
      'Comparative layer: regression gaps to best-in-scope baseline and Lighthouse-JMeter side-by-side matrix.',
    ],
  },
  {
    title: '5. Threats to validity',
    points: [
      'Internal validity threat: uncontrolled machine load may inflate variance; use repeated iterations and robust statistics.',
      'Construct validity threat: Lighthouse score is a weighted proxy, not direct UX truth; interpret with metric-specific evidence.',
      'Conclusion validity threat: small sample sizes increase uncertainty; avoid ranking frameworks from single-run results.',
      'External validity threat: benchmark routes may not represent full production workload diversity.',
    ],
  },
  {
    title: '6. Reproducibility protocol',
    points: [
      'Report run folder IDs, selected filters, chart metric, and exported artifact filenames for every figure.',
      'Keep run folders immutable; append new runs rather than rewriting historical artifacts.',
      'Document benchmark settings (iterations, route matrix, preset profiles, Lighthouse version) in methodology appendix.',
      'Use both dashboard exports and raw API endpoint snapshots to support replication audits.',
    ],
  },
];

const CHECKLIST = [
  'Define a baseline run folder before discussing regressions.',
  'Show sample size n for every comparative figure or table.',
  'Pair central tendency with spread or tail metrics (median + IQR, or mean + p95).',
  'State whether analysis is all-runs, multi-run subset, or single-run deep dive.',
  'Include at least one audit-level explanation for every major score claim.',
  'Archive raw artifacts used in thesis figures (JSON/HTML/CSV).',
];

export default function WikiMethodologyPage() {
  return (
    <div className="space-y-5 min-w-0">
      {/* Header */}
      <section className="rounded-xl border border-white/8 bg-card p-5">
        <p className="text-[10px] uppercase tracking-[0.3em] text-cyan-300/60">Knowledge Base</p>
        <h1 className="mt-1.5 text-2xl font-semibold text-foreground">Methodology</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
          This wiki section defines the scientific protocol behind the benchmark platform. It is structured for
          university-level reporting: clear objective definition, explicit assumptions, reproducibility safeguards,
          and validity-aware interpretation rules.
        </p>
      </section>

      {/* Sections */}
      <div className="grid gap-4">
        {SECTIONS.map(({ title, points }) => (
          <section key={title} className="rounded-xl border border-white/8 bg-card p-5">
            <h2 className="text-sm font-semibold text-foreground">{title}</h2>
            <ul className="mt-3 space-y-2">
              {points.map((point) => (
                <li key={point} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400/60" />
                  {point}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <section className="rounded-xl border border-cyan-400/15 bg-cyan-400/5 p-5">
        <h2 className="text-sm font-semibold text-cyan-100">Thesis reproducibility checklist</h2>
        <ul className="mt-3 space-y-2">
          {CHECKLIST.map((item) => (
            <li key={item} className="flex items-start gap-2.5 text-sm text-muted-foreground">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-300/70" />
              {item}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
