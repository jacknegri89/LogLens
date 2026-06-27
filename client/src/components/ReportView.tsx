import type { ReactNode } from 'react';

import { downloadMarkdown, formatDate } from '../lib/format';
import type { AnalysisRecord } from '../lib/types';
import { CopyButton } from './CopyButton';
import { SeverityBadge } from './SeverityBadge';

const chipClass =
  'rounded-sm border border-line px-2.5 py-1 font-head text-[9px] font-semibold tracking-[0.12em] uppercase text-fg-faint transition-colors hover:border-signal/30 hover:text-fg-muted';

export function ReportView({ analysis }: { analysis: AnalysisRecord }) {
  const { report } = analysis;

  return (
    <div className="space-y-3">
      {/* Header strip */}
      <div className="overflow-hidden rounded border border-line bg-surface-2">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <SeverityBadge severity={analysis.severity} />
            <span className="rounded-sm border border-line px-2 py-0.5 font-mono text-[9px] tracking-[0.08em] text-fg-faint">
              {analysis.category}
            </span>
          </div>
          <span className="font-mono text-[9px] text-fg-faint">{formatDate(analysis.createdAt)}</span>
        </div>
        <div className="border-t border-line px-5 py-4">
          <h3 className="font-head text-2xl font-extrabold uppercase leading-tight tracking-[0.01em] text-fg sm:text-3xl">
            {analysis.title}
          </h3>
        </div>
      </div>

      {report.keyLines.length > 0 && (
        <Panel title="Key log lines" variant="terminal">
          <pre className="overflow-x-auto font-mono text-[9px] leading-relaxed text-signal/70">
            {report.keyLines.join('\n')}
          </pre>
        </Panel>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        <Panel title="Probable causes">
          <ul className="space-y-2.5">
            {report.causes.map((cause, i) => (
              <li key={i} className="flex gap-2.5 text-xs text-fg-muted">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-signal" />
                <span>{cause}</span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Debug steps">
          <ol className="space-y-2.5">
            {report.debugSteps.map((step, i) => (
              <li key={i} className="flex gap-2.5 text-xs text-fg-muted">
                <span className="mt-px flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-signal/10 font-mono text-[8px] font-medium text-signal">
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
        <details>
          <summary className="cursor-pointer select-none font-head text-[9px] font-semibold tracking-[0.15em] uppercase text-fg-faint transition-colors hover:text-fg-muted">
            View markdown ({report.bugReportMarkdown.split('\n').length} lines)
          </summary>
          <pre className="mt-3 overflow-x-auto font-mono text-[9px] leading-relaxed whitespace-pre-wrap text-fg-muted">
            {report.bugReportMarkdown}
          </pre>
        </details>
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
    default: 'border-line bg-surface',
    terminal: 'border-line bg-ink-deep',
    special: 'border-line bg-surface-2',
  };

  return (
    <section className={`overflow-hidden rounded border ${styles[variant]}`}>
      <header className="flex items-center justify-between border-b border-line bg-surface-2 px-4 py-2.5">
        <h4 className="font-head text-[9px] font-bold tracking-[0.2em] uppercase text-fg-faint">{title}</h4>
        {action}
      </header>
      <div className="px-4 py-4">{children}</div>
    </section>
  );
}
