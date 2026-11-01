import type { ReactNode } from 'react';

import { downloadMarkdown, findLineNumbers, formatDate, isFailure } from '../lib/format';
import type { AnalysisRecord } from '../lib/types';
import { CopyButton } from './CopyButton';
import { SeverityBadge } from './SeverityBadge';

const actionClass = 'btn-paper px-4 py-2 text-[13px] font-bold tracking-wide uppercase';

/**
 * The review of one analysis. It sits on the dark desk, so the log excerpt is a
 * strip of paper and the failing lines are marked with the highlighter.
 */
export function ReportView({ analysis }: { analysis: AnalysisRecord }) {
  const { report } = analysis;
  const lineNumbers = findLineNumbers(analysis.rawLog, report.keyLines);

  return (
    <article className="space-y-9">
      <header>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <SeverityBadge severity={analysis.severity} />
          <span className="font-mono text-sm font-bold text-chalk">{analysis.category}</span>
          <span className="font-mono text-sm text-chalk-dim">{formatDate(analysis.createdAt)}</span>
        </div>
        <h2 className="mt-5 text-[26px] leading-tight font-extrabold break-words">
          {analysis.title}
        </h2>
      </header>

      {report.keyLines.length > 0 && (
        <Section title="Failing lines">
          <ul className="bands overflow-x-auto py-1 font-mono text-[13.5px] leading-[22px] text-ink">
            {report.keyLines.map((line, i) => (
              <li key={i} className="flex gap-4 px-3">
                <span className="w-8 shrink-0 text-right text-ink-soft select-none">
                  {lineNumbers.get(line) ?? ''}
                </span>
                <span
                  className={`whitespace-pre ${isFailure(line) ? 'bg-marker font-bold text-pen' : ''}`}
                >
                  {line}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="Probable causes">
        <ul className="space-y-3 text-[17px] leading-relaxed">
          {report.causes.map((cause, i) => (
            <li key={i} className="flex gap-3">
              <span className="font-extrabold text-marker" aria-hidden="true">
                →
              </span>
              <span>{cause}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Debug steps">
        <ol className="space-y-3 text-[17px] leading-relaxed">
          {report.debugSteps.map((step, i) => (
            <li key={i} className="flex gap-4">
              <span className="w-6 shrink-0 text-2xl leading-none font-extrabold text-marker [font-stretch:125%]">
                {i + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </Section>

      <Section title="GitHub issue">
        <div className="flex flex-wrap gap-3">
          <CopyButton
            text={report.bugReportMarkdown}
            label="Copy GitHub issue"
            copiedLabel="Copied"
            className={actionClass}
          />
          <button
            type="button"
            onClick={() => downloadMarkdown(`loglens-${analysis.id}.md`, report.bugReportMarkdown)}
            className={actionClass}
          >
            Download .md
          </button>
        </div>
        <details className="mt-5">
          <summary className="cursor-pointer font-bold underline decoration-2 underline-offset-4 select-none hover:bg-marker hover:text-ink">
            Show markdown ({report.bugReportMarkdown.split('\n').length} lines)
          </summary>
          <pre className="bands mt-4 overflow-x-auto p-4 font-mono text-[13.5px] leading-[22px] whitespace-pre-wrap text-ink">
            {report.bugReportMarkdown}
          </pre>
        </details>
      </Section>
    </article>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-4 border-b-2 border-chalk-dim pb-2 text-sm font-extrabold tracking-widest uppercase [font-stretch:125%]">
        {title}
      </h3>
      {children}
    </section>
  );
}
