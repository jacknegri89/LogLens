import { REPORT_TEXT } from '../content/report';
import { downloadMarkdown } from '../lib/format';
import { ACTION_BUTTON_CLASS } from '../lib/styles';
import { CopyButton } from './CopyButton';

/** Copy, download and preview of the GitHub issue written for an analysis. */
export function IssueActions({ id, markdown }: { id: string; markdown: string }) {
  return (
    <>
      <div className="report-drawer-actions">
        <CopyButton
          text={markdown}
          label={REPORT_TEXT.copyIssue}
          copiedLabel={REPORT_TEXT.copiedIssue}
          className={ACTION_BUTTON_CLASS}
        />
        <button
          type="button"
          onClick={() => downloadMarkdown(`loglens-${id}.md`, markdown)}
          className={ACTION_BUTTON_CLASS}
        >
          {REPORT_TEXT.downloadMarkdown}
        </button>
      </div>
      <details className="report-fold">
        <summary className="report-fold-summary">
          {REPORT_TEXT.showMarkdown(markdown.split('\n').length)}
        </summary>
        <pre className="report-fold-sheet bands">{markdown}</pre>
      </details>
    </>
  );
}
