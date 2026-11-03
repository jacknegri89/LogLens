import { ANALYZE_TEXT } from '../content/analyze';
import { ExampleButtons } from './ExampleButtons';
import { FileChip } from './FileChip';

/** Title of the log (a file chip, or "Log"), the line count and the sample logs. */
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
  return (
    // No wrapping from sm up: a long file name truncates instead of pushing the editor down.
    <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-ink px-5 py-3 sm:flex-nowrap">
      <div className="flex min-h-6 max-w-full min-w-0 items-center">
        {fileName ? (
          <FileChip name={fileName} size={fileSize} lineCount={lineCount} />
        ) : (
          <span className="font-mono text-sm font-bold">
            {ANALYZE_TEXT.untitledLog}
            {lineCount > 0 && ANALYZE_TEXT.lineCountSuffix(lineCount)}
          </span>
        )}
      </div>
      <div className="example-links shrink-0">
        <ExampleButtons onPickExample={onPickExample} />
      </div>
    </div>
  );
}
