import { SEVERITY_LABEL } from '../content/report';
import { severityColors } from '../lib/format';
import type { Severity } from '../lib/types';

/** A rubber stamp on a paper tag: double border, slightly crooked. */
export function SeverityBadge({ severity }: { severity: Severity }) {
  const colors = severityColors[severity];
  return (
    <span className="inline-block bg-paper p-1">
      <span
        className={`inline-block -rotate-3 border-[3px] border-double px-2.5 py-0.5 text-sm font-extrabold tracking-widest uppercase [font-stretch:125%] ${colors.text} ${colors.border}`}
      >
        {SEVERITY_LABEL[severity]}
      </span>
    </span>
  );
}
