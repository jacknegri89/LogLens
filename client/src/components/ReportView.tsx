import type { ReactNode } from 'react';

import { downloadMarkdown, formatDate } from '../lib/format';
import type { AnalysisRecord } from '../lib/types';
import { CopyButton } from './CopyButton';
import { SeverityBadge } from './SeverityBadge';

const chipClass =
  'rounded-md border border-line px-2.5 py-1 font-mono text-xs text-fg-muted transition-all hover:border-signal/40 hover:bg-signal/5 hover:text-fg';

const severityStripe: Record<string, string> = {
  high: 'bg-high/30',
  medium: 'bg-medium/25',
  low: 'bg-low/25',
};

export function ReportView({ analysis }: { analysis: AnalysisRecord }) {
  const { report } = analysis;

  return (
    <div className="space-y-4">
      {/* Header — colored stripe at top communicates severity at a glance */}
      <div className="overflow-hidden rounded-2xl border border-line bg-surface/60 shadow-lg shadow-black/30">
        <div className={`h-1 w-full ${severityStripe[analysis.severity] ?? 'bg-line'}`} />
        <div className="p-7">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <SeverityBadge severity={analysis.severity} />
              <span className="rounded-full border border-line/80 bg-surface-2/60 px-3 py-0.5 font-mono text-xs text-fg-faint">
                {analysis.category}
              </span>
            </div>
            <span className="font-mono text-xs text-fg-faint">{formatDate(analysis.createdAt)}</span>
          </div>
          <h3 className="mt-5 text-2xl leading-snug font-bold text-balance text-fg sm:text-3xl">
            {analysis.title}
          </h3>
        </div>
      </div>

      {report.keyLines.length > 0 && (
        <Panel title="Key log lines" variant="terminal">
          <pre className="overflow-x-auto font-mono text-xs leading-relaxed text-signal/80">
            {report.keyLines.join('\n')}
          </pre>
        </Panel>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Panel title="Probable causes">
          <ul className="space-y-3">
            {report.causes.map((cause, i) => (
              <li key={i} className="flex gap-3 text-sm text-fg-muted">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-signal" />
                <span>{cause}</span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Debug steps">
          <ol className="space-y-3">
            {report.debugSteps.map((step, i) => (
              <li key={i} className="flex gap-3 text-sm text-fg-muted">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-signal/10 font-mono text-xs font-semibold text-signal">
                  {i + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </Panel>
      </div>

      <Panel
        title="Bug report"
        variant="special"
        action={
          <div className="flex items-center gap-2">
            <CopyButton
              text={report.bugReportMarkdown}
              label="Copy GitHub issue"
              copiedLabel="Copied!"
              className={chipClass}
            />
            <button
              type="button"
              onClick={() =>
                downloadMarkdown(`loglens-${analysis.id}.md`, report.bugReportMarkdown)
              }
              className={chipClass}
            >
              Download .md
            </button>
          </div>
        }
      >
        <pre className="overflow-x-auto font-mono text-xs leading-relaxed whitespace-pre-wrap text-fg-muted">
          {report.bugReportMarkdown}
        </pre>
      </Panel>
    </div>
  );
}

type PanelVariant = 'default' | 'terminal' | 'special';

function Panel({
  title,
  action,
  children,
  variant = 'default',
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  variant?: PanelVariant;
}) {
  const styles: Record<PanelVariant, string> = {
    default: 'border-line bg-surface/40',
    terminal: 'border-line/80 bg-ink',
    special: 'border-line bg-surface-2',
  };

  return (
    <section className={`overflow-hidden rounded-2xl border ${styles[variant]}`}>
      <header className="flex items-center justify-between border-b border-line/60 px-5 py-3.5">
        <h4 className="font-mono text-xs tracking-[0.15em] text-fg-faint uppercase">{title}</h4>
        {action}
      </header>
      <div className="px-5 py-5">{children}</div>
    </section>
  );
}
