import { ANALYZE_TEXT } from '../content/analyze';
import { ExampleButtons } from './ExampleButtons';

/** Title of the log (file name or "Log"), the line count and the sample logs. */
export function EditorHeader({
  title,
  lineCount,
  onPickExample,
}: {
  title: string;
  lineCount: number;
  onPickExample: (content: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-ink px-5 py-3">
      <span className="font-mono text-sm font-bold">
        {title}
        {lineCount > 0 && ANALYZE_TEXT.lineCountSuffix(lineCount)}
      </span>
      <ExampleButtons onPickExample={onPickExample} />
    </div>
  );
}
