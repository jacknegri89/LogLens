import { ANALYZE_TEXT } from '../content/analyze';
import { useText } from '../i18n/useText';
import { formatFileSize } from '../lib/fileSize';

/** The loaded file as a paper tag: name, then size and line count on ink. */
export function FileChip({
  name,
  size,
  lineCount,
}: {
  name: string;
  size: number;
  lineCount: number;
}) {
  const text = useText(ANALYZE_TEXT);
  return (
    <span className="file-chip inline-flex max-w-full min-w-0 items-center border-2 border-ink font-mono text-sm leading-5">
      <span className="truncate px-2 font-bold" title={name}>
        {name}
      </span>
      <span className="shrink-0 self-stretch bg-ink px-1.5 text-xs leading-5 whitespace-nowrap text-paper">
        {formatFileSize(size)} · {text.fileChipLines(lineCount)}
      </span>
    </span>
  );
}
