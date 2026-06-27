import { severityMeta } from '../lib/format';
import type { Severity } from '../lib/types';

const glowShadow: Record<Severity, string> = {
  high: 'shadow-[0_0_10px_rgba(247,109,109,0.3)]',
  medium: 'shadow-[0_0_10px_rgba(243,179,64,0.25)]',
  low: 'shadow-[0_0_10px_rgba(84,174,245,0.25)]',
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  const meta = severityMeta[severity];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-xs font-medium ${meta.badge} ${glowShadow[severity]}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${meta.dot} ${severity === 'high' ? 'animate-pulse-dot' : ''}`}
      />
      {meta.label}
    </span>
  );
}
