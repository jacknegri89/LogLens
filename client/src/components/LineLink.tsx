import { INCIDENTS_TEXT } from '../content/incidents';
import { useText } from '../i18n/useText';
import { logHash } from '../lib/logFocus';

/** A piece of evidence's place in the log: a link when the log is on the page, plain text otherwise. */
export function LineLink({
  start,
  end,
  enabled,
}: {
  start: number;
  end: number;
  enabled: boolean;
}) {
  const text = useText(INCIDENTS_TEXT);
  const label = text.lineLabel(start, end);
  if (!enabled) {
    return <span className="incident-line">{label}</span>;
  }
  return (
    <a className="incident-line" href={logHash(start, end)} aria-label={text.openLine(start)}>
      {label}
    </a>
  );
}
