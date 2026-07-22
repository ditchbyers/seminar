import Link from 'next/link';
import { BookOpen, BarChart3, FlaskConical, Cpu, BookMarked } from 'lucide-react';

const WIKI_SECTIONS = [
  {
    href: '/wiki/metrics',
    icon: BarChart3,
    title: 'Metrics Reference',
    description:
      'Canonical definitions of every Lighthouse metric in the dashboard — units, interpretation direction, and analytical role.',
  },
  {
    href: '/wiki/statistics',
    icon: FlaskConical,
    title: 'Statistical Values',
    description:
      'Explanation of the descriptive statistics computed across iterations: mean, median, standard deviation, IQR, p90, and p95.',
  },
  {
    href: '/wiki/frameworks',
    icon: Cpu,
    title: 'Framework Terms',
    description:
      'Definitions of framework, version, preset, and route — the four dimensions that structure every row in the benchmark dataset.',
  },
  {
    href: '/wiki/methodology',
    icon: BookMarked,
    title: 'Methodology',
    description:
      'End-to-end description of how Lighthouse reports are collected, normalized, stored, and surfaced in the dashboard.',
  },
];

export default function WikiHomePage() {
  return (
    <div className="space-y-5 min-w-0">
      {/* Header */}
      <section className="rounded-xl border border-white/8 bg-card p-5">
        <p className="text-[10px] uppercase tracking-[0.3em] text-cyan-300/60">Knowledge Base</p>
        <h1 className="mt-1.5 text-2xl font-semibold text-foreground">Lighthouse Statistical Evaluation Handbook</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
          This handbook documents the benchmark design, the meaning of each metric, the statistical treatment applied to
          repeated measurements, and the interpretation rules required for a scientifically defensible analysis.
        </p>
      </section>

      {/* How to use */}
      <section className="rounded-xl border border-white/8 bg-card p-5">
        <h2 className="text-base font-semibold text-foreground">How to use this handbook</h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
          Start with the Methodology page to understand how raw Lighthouse reports are collected and normalized. Then read
          the Metrics and Statistics pages to learn what each field means and why certain summary measures are preferred
          over raw single-point values. The Frameworks page explains the benchmarking dimensions so tables and graphs can
          be interpreted correctly across runs, platforms, and iterations.
        </p>
      </section>

      {/* Section cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        {WIKI_SECTIONS.map(({ href, icon: Icon, title, description }) => (
          <Link
            key={href}
            href={href}
            className="group flex gap-4 rounded-xl border border-white/8 bg-card p-5 transition-colors hover:border-cyan-400/30 hover:bg-cyan-400/5"
          >
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/8 bg-white/5 group-hover:border-cyan-400/25 group-hover:bg-cyan-400/10 transition-colors">
              <Icon className="h-4 w-4 text-muted-foreground group-hover:text-cyan-300 transition-colors" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground group-hover:text-cyan-100 transition-colors">{title}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
