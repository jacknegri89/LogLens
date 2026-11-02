/** Line numbers beside the editor. Failing lines get the highlighter. */
export function EditorGutter({
  rows,
  rowHeights,
  failingLines,
}: {
  rows: number;
  rowHeights: number[];
  failingLines: Set<number>;
}) {
  return (
    <ol
      className="sticky left-0 z-10 shrink-0 border-r-2 border-ink bg-paper text-right text-ink-soft select-none"
      aria-hidden="true"
    >
      {Array.from({ length: rows }, (_, i) => (
        <GutterNumber
          key={i}
          number={i + 1}
          height={rowHeights[i]}
          failing={failingLines.has(i + 1)}
        />
      ))}
    </ol>
  );
}

function GutterNumber({
  number,
  height,
  failing,
}: {
  number: number;
  height: number | undefined;
  failing: boolean;
}) {
  return (
    <li style={{ height }} className={`px-3 ${failing ? 'bg-marker font-bold text-pen' : ''}`}>
      {number}
    </li>
  );
}
