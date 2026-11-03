import { SEVERITY_LABEL } from '../content/report';
import type { Severity } from '../lib/types';

/** A small rubber stamp in worn ink, pressed slightly crooked. It belongs on paper. */
export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span className="stamp report-stamp-small" data-severity={severity}>
      {SEVERITY_LABEL[severity]}
    </span>
  );
}
