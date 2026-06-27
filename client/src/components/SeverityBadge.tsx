import { severityMeta } from '../lib/format';
import type { Severity } from '../lib/types';

export function SeverityBadge({ severity }: { severity: Severity }) {
  const meta = severityMeta[severity];
  return (
    <span
      className={`inline-flex items-center gap-1.5 border px-2.5 py-0.5 font-head text-[10px] font-bold tracking-[0.15em] uppercase ${meta.badge}`}
    >
      <span className={`h-1 w-1 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
}
