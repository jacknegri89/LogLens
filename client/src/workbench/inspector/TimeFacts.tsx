import { INSPECTOR_TEXT } from '../../content/workbenchInspect';
import { useText } from '../../i18n/useText';
import { describeAge } from './decode/epoch';

/** One moment shown three ways: UTC, local, and how long ago (or from now) it is. */
export function TimeFacts({
  epochMilliseconds,
  nowMilliseconds,
}: {
  epochMilliseconds: number;
  nowMilliseconds: number;
}) {
  const text = useText(INSPECTOR_TEXT);
  const date = new Date(epochMilliseconds);
  const age = describeAge(epochMilliseconds, nowMilliseconds);
  return (
    <dl className="inspect-facts">
      <dt>{text.utc}</dt>
      <dd>{date.toISOString()}</dd>
      <dt>{text.local}</dt>
      <dd>{date.toLocaleString()}</dd>
      <dd className="inspect-facts-age">{text.age(age.amount, age.unit, age.inFuture)}</dd>
    </dl>
  );
}
