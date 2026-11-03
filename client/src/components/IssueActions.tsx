import { REPORT_TEXT } from '../content/report';
import { downloadMarkdown } from '../lib/format';
import { ACTION_BUTTON_CLASS } from '../lib/styles';
import { CopyButton } from './CopyButton';

/** Copy, download and preview of the GitHub issue written for an analysis. */
export function IssueActions({ id, markdown }: { id: string; markdown: string }) {
  return (
    <>
      <div className="flex flex-wrap gap-3">
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
      <details className="mt-5">
        <summary className="cursor-pointer font-bold underline decoration-2 underline-offset-4 select-none hover:bg-marker hover:text-ink">
          {REPORT_TEXT.showMarkdown(markdown.split('\n').length)}
        </summary>
        <pre className="bands mt-4 overflow-x-auto p-4 font-mono text-[13.5px] leading-[22px] whitespace-pre-wrap text-ink">
          {markdown}
        </pre>
      </details>
    </>
  );
}
