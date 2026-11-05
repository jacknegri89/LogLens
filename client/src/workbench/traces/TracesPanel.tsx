import '../../styles/workbench-inspect.css';

import { TRACES_TEXT } from '../../content/workbenchInspect';
import { useText } from '../../i18n/useText';
import { useWorkbench } from '../core/useWorkbench';
import { TraceIdList } from './TraceIdList';
import { useTraceView } from './useTraceView';
import { WaterfallView } from './WaterfallView';

function NoIds() {
  const text = useText(TRACES_TEXT);
  return (
    <div className="wb-empty">
      <h3>{text.emptyTitle}</h3>
      <p>{text.emptyBody}</p>
      <p className="inspect-muted">
        {text.emptyExamples}: <code>{text.exampleFields}</code>
      </p>
    </div>
  );
}

/** Follows one request across services: the ids found in the log and the waterfall of the chosen one. */
export function TracesPanel() {
  const text = useText(TRACES_TEXT);
  const { lines } = useWorkbench();
  const view = useTraceView(lines);
  const hasIds = view.active !== null;
  let intro = text.intro;
  if (lines.length === 0) {
    intro = text.noLog;
  }

  return (
    <section className="trace-view">
      <p className="wb-intro">{intro}</p>
      {lines.length > 0 && !hasIds && <NoIds />}
      {hasIds && (
        <div className="trace-layout">
          <TraceIdList
            correlations={view.visible}
            activeId={view.active?.id ?? null}
            hiddenCount={view.hiddenCount}
            filter={view.filter}
            onFilter={view.setFilter}
            onChoose={view.choose}
            onShowMore={view.showMore}
          />
          {view.active && view.waterfall && (
            <WaterfallView correlation={view.active} waterfall={view.waterfall} />
          )}
        </div>
      )}
    </section>
  );
}
