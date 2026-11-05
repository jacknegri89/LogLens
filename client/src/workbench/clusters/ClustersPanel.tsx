import '../../styles/workbench-inspect.css';

import { CLUSTERS_TEXT } from '../../content/workbenchInspect';
import { useText } from '../../i18n/useText';
import { useWorkbench } from '../core/useWorkbench';
import { ClusterControls } from './ClusterControls';
import { ClusterRow } from './ClusterRow';
import { PAGE_SIZE, useClusterView, type ClusterView } from './useClusterView';

function ClusterList({ view }: { view: ClusterView }) {
  const text = useText(CLUSTERS_TEXT);
  const { lines } = useWorkbench();
  if (view.total === 0) {
    return (
      <div className="wb-empty">
        <h3>{text.emptyFaultsTitle}</h3>
        <p>{text.emptyFaults}</p>
      </div>
    );
  }
  return (
    <>
      <ul className="cluster-list" aria-label={text.listLabel}>
        {view.visible.map((cluster) => (
          <ClusterRow key={cluster.template} cluster={cluster} lines={lines} plan={view.plan} />
        ))}
      </ul>
      {view.hiddenCount > 0 && (
        <button type="button" className="wb-more" onClick={view.showMore}>
          {text.showMore(Math.min(view.hiddenCount, PAGE_SIZE))}
        </button>
      )}
    </>
  );
}

/** Lines grouped by what they say, with how often each group happened and when. */
export function ClustersPanel() {
  const text = useText(CLUSTERS_TEXT);
  const { lines } = useWorkbench();
  const view = useClusterView(lines);
  let intro = text.intro;
  if (lines.length === 0) {
    intro = text.noLog;
  }

  return (
    <section className="cluster-view">
      <p className="wb-intro">{intro}</p>
      {lines.length > 0 && (
        <>
          <ClusterControls
            faultsOnly={view.faultsOnly}
            sort={view.sort}
            onFaultsOnly={view.setFaultsOnly}
            onSort={view.setSort}
            summary={text.summary(view.total, lines.length)}
          />
          <ClusterList view={view} />
        </>
      )}
    </section>
  );
}
