import { severityMeta } from '../lib/format';
import type { Severity } from '../lib/types';

export function SeverityBadge({ severity }: { severity: Severity }) {
  const meta = severityMeta[severity];
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-[11px] font-medium tracking-wide ${meta.text} ${meta.border}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${meta.dot}`}
        style={{ boxShadow: `0 0 10px ${meta.glow}` }}
      />
      {meta.label}
    </span>
  );
}
