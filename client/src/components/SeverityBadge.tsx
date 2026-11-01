import { severityMeta } from '../lib/format';
import type { Severity } from '../lib/types';

export function SeverityBadge({ severity }: { severity: Severity }) {
  const meta = severityMeta[severity];
  return (
    <span
      className={`inline-block border px-2 py-0.5 font-mono text-[11px] font-medium tracking-wider uppercase ${meta.text} ${meta.border}`}
    >
      {meta.label}
    </span>
  );
}
