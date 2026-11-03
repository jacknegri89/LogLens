import { INSPECTOR_TEXT } from '../../content/workbenchInspect';
import { useText } from '../../i18n/useText';
import type { ParsedLine } from '../types';

function FaultMark({ line }: { line: ParsedLine }) {
  return line.isFault ? <span className="inspect-fault" aria-hidden="true" /> : null;
}

/** Time, level, service and latency of one line. */
export function LineFacts({ line }: { line: ParsedLine }) {
  const text = useText(INSPECTOR_TEXT);
  const date = line.timestamp === null ? null : new Date(line.timestamp);
  return (
    <dl className="inspect-facts">
      <dt>{text.timeUtc}</dt>
      <dd>{date ? date.toISOString() : text.none}</dd>
      <dt>{text.timeLocal}</dt>
      <dd>{date ? date.toLocaleString() : text.none}</dd>
      <dt>{text.level}</dt>
      <dd>
        <FaultMark line={line} />
        {line.level ?? text.none}
      </dd>
      <dt>{text.service}</dt>
      <dd>{line.service ?? text.none}</dd>
      <dt>{text.latency}</dt>
      <dd>{line.latencyMs === null ? text.none : text.latencyValue(line.latencyMs)}</dd>
    </dl>
  );
}
