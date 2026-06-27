import type { ReactNode } from 'react';

import { downloadMarkdown, formatDate } from '../lib/format';
import type { AnalysisRecord } from '../lib/types';
import { CopyButton } from './CopyButton';
import { SeverityBadge } from './SeverityBadge';

const chipClass =
  'rounded-md border border-line px-2.5 py-1 font-mono text-xs text-fg-muted transition-colors hover:border-signal/50 hover:text-fg';

export function ReportView({ analysis }: { analysis: AnalysisRecord }) {
  const { report } = analysis;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-line bg-surface/60 p-6">
        <div className="flex flex-wrap items-center gap-3">
          <SeverityBadge severity={analysis.severity} />
          <span className="rounded-full border border-line px-2.5 py-0.5 font-mono text-xs text-fg-muted">
            {analysis.category}
          </span>
          <span className="font-mono text-xs text-fg-faint">{formatDate(analysis.createdAt)}</span>
        </div>
        <h3 className="mt-4 text-2xl leading-snug font-bold text-balance text-fg">
          {analysis.title}
        </h3>
      </div>

      {report.keyLines.length > 0 && (
        <Panel title="Key log lines">
          <pre className="overflow-x-auto font-mono text-xs leading-relaxed text-fg-muted">
            {report.keyLines.join('\n')}
          </pre>
        </Panel>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        <Panel title="Probable causes">
          <ul className="space-y-2.5">
            {report.causes.map((cause, i) => (
              <li key={i} className="flex gap-2.5 text-sm text-fg-muted">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-signal" />
                <span>{cause}</span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Debug steps">
          <ol className="space-y-2.5">
            {report.debugSteps.map((step, i) => (
              <li key={i} className="flex gap-2.5 text-sm text-fg-muted">
                <span className="font-mono text-xs text-signal">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </Panel>
      </div>

      <Panel
        title="Bug report"
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

function Panel({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-line bg-surface/40">
      <header className="flex items-center justify-between border-b border-line px-5 py-3">
        <h4 className="font-mono text-xs tracking-wider text-fg-faint uppercase">{title}</h4>
        {action}
      </header>
      <div className="px-5 py-4">{children}</div>
    </section>
  );
}
