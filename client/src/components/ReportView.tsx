import type { ReactNode } from 'react';

import { downloadMarkdown, findLineNumbers, formatDate, lineTone } from '../lib/format';
import type { AnalysisRecord } from '../lib/types';
import { CopyButton } from './CopyButton';
import { SeverityBadge } from './SeverityBadge';

const actionClass =
  'border border-rule-strong px-3 py-1.5 text-[13px] font-medium text-ink hover:bg-ink hover:text-paper';

export function ReportView({ analysis }: { analysis: AnalysisRecord }) {
  const { report } = analysis;
  const lineNumbers = findLineNumbers(analysis.rawLog, report.keyLines);

  return (
    <article className="space-y-8">
      <header>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <SeverityBadge severity={analysis.severity} />
          <span className="font-mono text-xs text-muted">{analysis.category}</span>
          <span className="font-mono text-xs text-faint">{formatDate(analysis.createdAt)}</span>
        </div>
        <h2 className="mt-4 text-[22px] leading-snug font-semibold break-words">
          {analysis.title}
        </h2>
      </header>

      {report.keyLines.length > 0 && (
        <Section title="Failing lines">
          <ul className="overflow-x-auto border border-rule bg-panel font-mono text-[12.5px] leading-6">
            {report.keyLines.map((line, i) => (
              <li key={i} className="flex gap-4 px-3">
                <span className="w-8 shrink-0 text-right text-faint select-none">
                  {lineNumbers.get(line) ?? ''}
                </span>
                <span className={`whitespace-pre ${lineTone(line)}`}>{line}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="Probable causes">
        <ul className="space-y-2 text-[15px] leading-relaxed">
          {report.causes.map((cause, i) => (
            <li key={i} className="flex gap-3">
              <span className="text-faint" aria-hidden="true">
                –
              </span>
              <span>{cause}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Debug steps">
        <ol className="space-y-2 text-[15px] leading-relaxed">
          {report.debugSteps.map((step, i) => (
            <li key={i} className="flex gap-3">
              <span className="w-5 shrink-0 font-mono text-sm text-faint">{i + 1}.</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </Section>

      <Section title="GitHub issue">
        <div className="flex flex-wrap gap-2">
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
        <details className="mt-4">
          <summary className="cursor-pointer text-sm text-muted underline underline-offset-4 select-none hover:text-ink">
            Show markdown ({report.bugReportMarkdown.split('\n').length} lines)
          </summary>
          <pre className="mt-3 overflow-x-auto border border-rule bg-panel p-4 font-mono text-[12.5px] leading-6 whitespace-pre-wrap">
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
      <h3 className="mb-3 border-b border-rule pb-2 text-[13px] font-semibold">{title}</h3>
      {children}
    </section>
  );
}
