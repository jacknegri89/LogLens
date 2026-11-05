import { INSPECTOR_TEXT } from '../../content/workbenchInspect';
import { useText } from '../../i18n/useText';
import type { ParsedLine } from '../types';

function FaultMark({ line }: { line: ParsedLine }) {
  if (line.isFault) {
    return <span className="inspect-fault" aria-hidden="true" />;
  }
  return null;
}

/** Time, level, service and latency of one line. */
export function LineFacts({ line }: { line: ParsedLine }) {
  const text = useText(INSPECTOR_TEXT);
  let utcTime = text.none;
  let localTime = text.none;
  if (line.timestamp !== null) {
    const date = new Date(line.timestamp);
    utcTime = date.toISOString();
    localTime = date.toLocaleString();
  }
  let latency = text.none;
  if (line.latencyMs !== null) {
    latency = text.latencyValue(line.latencyMs);
  }
  return (
    <dl className="inspect-facts">
      <dt>{text.timeUtc}</dt>
      <dd>{utcTime}</dd>
      <dt>{text.timeLocal}</dt>
      <dd>{localTime}</dd>
      <dt>{text.level}</dt>
      <dd>
        <FaultMark line={line} />
        {line.level ?? text.none}
      </dd>
      <dt>{text.service}</dt>
      <dd>{line.service ?? text.none}</dd>
      <dt>{text.latency}</dt>
      <dd>{latency}</dd>
    </dl>
  );
}
