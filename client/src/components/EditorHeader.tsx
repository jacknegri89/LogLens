import { ANALYZE_TEXT } from '../content/analyze';
import { useText } from '../i18n/useText';
import { ExampleButtons } from './ExampleButtons';
import { FileChip } from './FileChip';

/** The exhibit label, the title of the log (a file chip, or "Log"), the line count and the samples. */
export function EditorHeader({
  fileName,
  fileSize,
  lineCount,
  onPickExample,
}: {
  fileName: string | null;
  fileSize: number;
  lineCount: number;
  onPickExample: (content: string) => void;
}) {
  const text = useText(ANALYZE_TEXT);
  let fileLabel;
  if (fileName) {
    fileLabel = <FileChip name={fileName} size={fileSize} lineCount={lineCount} />;
  } else {
    fileLabel = (
      <span className="font-mono text-sm font-bold">
        {text.untitledLog}
        {lineCount > 0 && text.lineCountSuffix(lineCount)}
      </span>
    );
  }
  return (
    <div className="border-b-2 border-ink px-5 pt-6 pb-3">
      <p className="evidence-label text-pen-deep" aria-hidden="true">
        {text.exhibitLog}
      </p>
      {/* No wrapping from sm up: a long file name truncates instead of pushing the editor down. */}
      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-3 sm:flex-nowrap">
        <div className="flex min-h-6 max-w-full min-w-0 items-center">{fileLabel}</div>
        <div className="example-links max-w-full sm:shrink-0">
          <ExampleButtons onPickExample={onPickExample} />
        </div>
      </div>
    </div>
  );
}
