import type { ReactNode } from 'react';

import { downloadMarkdown, formatDate, lineTone, severityMeta } from '../lib/format';
import type { AnalysisRecord } from '../lib/types';
import { CopyButton } from './CopyButton';
import { SeverityBadge } from './SeverityBadge';

const actionClass =
  'rounded-full border border-line-strong px-4 py-1.5 text-sm text-fg-muted transition-colors hover:bg-white/5 hover:text-fg';

export function ReportView({ analysis }: { analysis: AnalysisRecord }) {
  const { report } = analysis;
  const glow = severityMeta[analysis.severity].glow;

  return (
    <div className="animate-sweep space-y-4">
      {/* Headline: a ray of the severity colour runs along the left edge */}
      <div className="glass relative overflow-hidden px-7 py-7 sm:px-9">
        <span
          className="absolute inset-y-0 left-0 w-1"
          style={{ background: glow, boxShadow: `0 0 30px 4px ${glow}` }}
          aria-hidden="true"
        />
        <div className="flex flex-wrap items-center gap-3">
          <SeverityBadge severity={analysis.severity} />
          <span className="rounded-full border border-line px-3 py-1 font-mono text-[11px] text-fg-faint">
            {analysis.category}
          </span>
          <span className="ml-auto font-mono text-xs text-fg-faint">
            {formatDate(analysis.createdAt)}
          </span>
        </div>
        <h3 className="mt-5 font-display text-[clamp(1.2rem,2.6vw,1.9rem)] leading-snug font-normal tracking-tight break-words text-fg">
          {analysis.title}
        </h3>
      </div>

      {report.keyLines.length > 0 && (
        <Panel title="Failing lines">
          <pre className="overflow-x-auto font-mono text-[13px] leading-7">
            {report.keyLines.map((line, i) => (
              <span key={i} className={`block ${lineTone(line)}`}>
                {line}
              </span>
            ))}
          </pre>
        </Panel>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Panel title="Probable causes">
          <ul className="space-y-3.5">
            {report.causes.map((cause, i) => (
              <li key={i} className="flex gap-3 text-[15px] leading-relaxed text-fg-muted">
                <span
                  className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-violet"
                  style={{ boxShadow: '0 0 10px #8f6bff' }}
                />
                <span>{cause}</span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Debug steps">
          <ol className="space-y-3.5">
            {report.debugSteps.map((step, i) => (
              <li key={i} className="flex gap-3 text-[15px] leading-relaxed text-fg-muted">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-line-strong font-mono text-xs text-fg">
                  {i + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </Panel>
      </div>

      <Panel
        title="GitHub issue"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <CopyButton
              text={report.bugReportMarkdown}
              label="Copy GitHub issue"
              copiedLabel="Copied"
              className={actionClass}
            />
            <button
              type="button"
              onClick={() =>
                downloadMarkdown(`loglens-${analysis.id}.md`, report.bugReportMarkdown)
              }
              className={actionClass}
            >
              Download .md
            </button>
          </div>
        }
      >
        <details>
          <summary className="cursor-pointer text-sm text-fg-muted transition-colors select-none hover:text-fg">
            Show markdown ({report.bugReportMarkdown.split('\n').length} lines)
          </summary>
          <pre className="mt-4 overflow-x-auto font-mono text-[13px] leading-relaxed whitespace-pre-wrap text-fg-muted">
            {report.bugReportMarkdown}
          </pre>
        </details>
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
    <section className="glass overflow-hidden">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-6 py-4">
        <h4 className="font-display text-sm font-medium tracking-wide text-fg">{title}</h4>
        {action}
      </header>
      <div className="px-6 py-5">{children}</div>
    </section>
  );
}
