import { isFailure } from '../lib/format';

/** The key lines of the log, numbered, with the failures marked by the highlighter. */
export function FailingLines({
  lines,
  lineNumbers,
}: {
  lines: string[];
  lineNumbers: Map<string, number>;
}) {
  return (
    <ul className="bands overflow-x-auto py-1 font-mono text-[13.5px] leading-[22px] text-ink">
      {lines.map((line, i) => (
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
  );
}
