import { PRINTOUT } from '../content/hero';

const FAILING_CLASS = 'bg-marker font-bold text-pen';

/** A sheet of log lines. Under the glass, the failing lines get the highlighter. */
export function Printout({ magnified }: { magnified: boolean }) {
  return (
    <div className="bands perforated absolute inset-0 overflow-hidden pt-0 pl-10 font-mono text-[14px] leading-[22px] text-ink">
      {PRINTOUT.map((line, i) => (
        <div
          key={i}
          className={`whitespace-pre ${magnified && line.failing ? FAILING_CLASS : 'text-ink-soft'}`}
        >
          {line.text}
        </div>
      ))}
    </div>
  );
}
