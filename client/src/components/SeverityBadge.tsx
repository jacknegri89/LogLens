import { severityMeta } from '../lib/format';
import type { Severity } from '../lib/types';

export function SeverityBadge({ severity }: { severity: Severity }) {
  const meta = severityMeta[severity];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-xs ${meta.badge}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
}
