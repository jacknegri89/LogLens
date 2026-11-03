import { TRACES_TEXT } from '../../content/workbenchInspect';
import { useText } from '../../i18n/useText';
import type { Correlation } from './correlationIds';
import { formatDelta } from './waterfall';

interface TraceIdListProps {
  correlations: readonly Correlation[];
  activeId: string | null;
  hiddenCount: number;
  filter: string;
  onFilter: (value: string) => void;
  onChoose: (id: string) => void;
  onShowMore: () => void;
}

function IdMeta({ correlation }: { correlation: Correlation }) {
  const text = useText(TRACES_TEXT);
  const parts = [
    text.lines(correlation.positions.length),
    text.services(correlation.services.length),
  ];
  if (correlation.durationMs !== null) parts.push(formatDelta(correlation.durationMs).slice(1));
  if (correlation.faultCount > 0) parts.push(text.faults(correlation.faultCount));
  return (
    <span className="trace-id-meta">
      <span className="trace-kind">{text.kinds[correlation.kind]}</span>
      {parts.join(' · ')}
    </span>
  );
}

interface IdButtonProps {
  correlation: Correlation;
  active: boolean;
  onChoose: (id: string) => void;
}

function IdButton({ correlation, active, onChoose }: IdButtonProps) {
  return (
    <li>
      <button
        type="button"
        className="trace-id"
        data-fault={correlation.faultCount > 0}
        aria-pressed={active}
        onClick={() => onChoose(correlation.id)}
      >
        <span className="trace-id-name">{correlation.id}</span>
        <IdMeta correlation={correlation} />
      </button>
    </li>
  );
}

/** Every request id found, faulty ones first, with a filter. */
export function TraceIdList(props: TraceIdListProps) {
  const text = useText(TRACES_TEXT);
  return (
    <div>
      <input
        type="search"
        className="trace-filter"
        aria-label={text.filterLabel}
        placeholder={text.filterPlaceholder}
        value={props.filter}
        onChange={(event) => props.onFilter(event.target.value)}
      />
      {props.correlations.length === 0 && <p className="inspect-muted">{text.noMatch}</p>}
      <ul className="trace-ids" aria-label={text.listLabel}>
        {props.correlations.map((correlation) => (
          <IdButton
            key={correlation.id}
            correlation={correlation}
            active={correlation.id === props.activeId}
            onChoose={props.onChoose}
          />
        ))}
      </ul>
      {props.hiddenCount > 0 && (
        <button type="button" className="wb-more" onClick={props.onShowMore}>
          {text.showMore(props.hiddenCount)}
        </button>
      )}
    </div>
  );
}
