import { REPORT_TEXT } from '../content/report';
import { useText } from '../i18n/useText';
import type { Severity } from '../lib/types';

/** A small rubber stamp in worn ink, pressed slightly crooked. It belongs on paper. */
export function SeverityBadge({ severity }: { severity: Severity }) {
  const text = useText(REPORT_TEXT);
  return (
    <span className="stamp report-stamp-small" data-severity={severity}>
      {text.severityLabels[severity]}
    </span>
  );
}
