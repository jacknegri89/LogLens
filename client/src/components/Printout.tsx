import { ANALYZE_TEXT } from '../content/analyze';
import { PRINTOUT, type PrintLine } from '../content/hero';

const FAILING_CLASS = 'bg-marker font-bold text-pen';

/** Numbers each run of failing lines (E1, E2...): the tag goes on the first line of the run. */
function evidenceNumbers(lines: PrintLine[]): Map<number, number> {
  const numbers = new Map<number, number>();
  lines.forEach((line, index) => {
    if (line.failing && !lines[index - 1]?.failing) numbers.set(index, numbers.size + 1);
  });
  return numbers;
}

const EVIDENCE_NUMBERS = evidenceNumbers(PRINTOUT);

/** A sheet of log lines with evidence tags. Under the glass, the failing lines get the highlighter. */
export function Printout({ magnified }: { magnified: boolean }) {
  return (
    <div className="bands perforated absolute inset-0 overflow-hidden pl-10 font-mono text-[14px] leading-[22px] text-ink">
      {PRINTOUT.map((line, index) => (
        <div
          key={index}
          className={`whitespace-pre ${magnified && line.failing ? FAILING_CLASS : 'text-ink-soft'}`}
        >
          {line.text}
          <PrintoutTag number={EVIDENCE_NUMBERS.get(index)} />
        </div>
      ))}
    </div>
  );
}

function PrintoutTag({ number }: { number: number | undefined }) {
  if (number === undefined) return null;
  return (
    <span className="evidence-tag printout-tag max-sm:hidden">
      {ANALYZE_TEXT.evidenceTag(number)}
    </span>
  );
}
