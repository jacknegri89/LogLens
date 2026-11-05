import { PRINTOUT } from '../content/hero';

const FAILING_CLASS = 'bg-marker font-bold text-pen';

/** A sheet of log lines. Under the glass, the failing lines get the highlighter. */
export function Printout({ magnified }: { magnified: boolean }) {
  return (
    <div className="bands perforated absolute inset-0 overflow-hidden pl-10 font-mono text-[14px] leading-[22px] text-ink">
      {PRINTOUT.map((line, index) => {
        let lineClass = 'text-ink-soft';
        if (magnified && line.failing) {
          lineClass = FAILING_CLASS;
        }
        return (
          <div key={index} className={`whitespace-pre ${lineClass}`}>
            {line.text}
          </div>
        );
      })}
    </div>
  );
}
