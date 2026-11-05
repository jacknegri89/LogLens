import { FIX_TEXT } from '../../../content/workbenchFix';
import { useText } from '../../../i18n/useText';
import '../../../styles/workbench-fix.css';
import { toSideBySideRows, type DiffLine, type SideBySideRow } from './diff';

const MARKS = { same: ' ', removed: '-', added: '+' } as const;

function DiffRow({ line }: { line: DiffLine | null }) {
  if (!line) {
    return <div className="fix-diff-line fix-diff-filler" aria-hidden="true" />;
  }
  return (
    <div className="fix-diff-line" data-kind={line.kind}>
      <span className="fix-diff-sign">{MARKS[line.kind]}</span>
      <span className="fix-diff-text">{line.text}</span>
    </div>
  );
}

function SidePane({ title, lines }: { title: string; lines: (DiffLine | null)[] }) {
  return (
    <section className="fix-diff-pane" aria-label={title}>
      <h4 className="fix-diff-heading">{title}</h4>
      <div className="fix-diff-lines" tabIndex={0} role="region" aria-label={title}>
        {lines.map((line, index) => (
          <DiffRow key={index} line={line} />
        ))}
      </div>
    </section>
  );
}

/** Old code on the left, new code on the right; stacked on a phone. Lines carry a - or + sign. */
export function SideBySideDiff({ diff }: { diff: DiffLine[] }) {
  const text = useText(FIX_TEXT).remediation;
  const rows: SideBySideRow[] = toSideBySideRows(diff);
  return (
    <div className="fix-diff-columns">
      <SidePane title={text.before} lines={rows.map((row) => row.left)} />
      <SidePane title={text.after} lines={rows.map((row) => row.right)} />
    </div>
  );
}

/** One column: unchanged lines, then removed (-) and added (+) lines where they differ. */
export function UnifiedDiff({ diff }: { diff: DiffLine[] }) {
  const text = useText(FIX_TEXT).remediation;
  return (
    <div className="fix-diff-lines" tabIndex={0} role="region" aria-label={text.unified}>
      {diff.map((line, index) => (
        <DiffRow key={index} line={line} />
      ))}
    </div>
  );
}
