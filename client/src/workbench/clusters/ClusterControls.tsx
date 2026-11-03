import { CLUSTERS_TEXT } from '../../content/workbenchInspect';
import { useText } from '../../i18n/useText';
import type { ClusterSort } from './buildClusters';

const SORTS: readonly ClusterSort[] = ['count', 'recency', 'severity'];

interface ClusterControlsProps {
  faultsOnly: boolean;
  sort: ClusterSort;
  onFaultsOnly: (value: boolean) => void;
  onSort: (value: ClusterSort) => void;
  summary: string;
}

interface SegmentOption {
  key: string;
  label: string;
  pressed: boolean;
  onPress: () => void;
}

function SegmentControl({
  id,
  label,
  options,
}: {
  id: string;
  label: string;
  options: SegmentOption[];
}) {
  return (
    <div className="wb-control">
      <span className="wb-control-label" id={id}>
        {label}
      </span>
      <div role="group" aria-labelledby={id} className="wb-segment">
        {options.map((option) => (
          <button
            key={option.key}
            type="button"
            aria-pressed={option.pressed}
            onClick={option.onPress}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Faults only / All, the sort order and how many clusters are listed. */
export function ClusterControls({
  faultsOnly,
  sort,
  onFaultsOnly,
  onSort,
  summary,
}: ClusterControlsProps) {
  const text = useText(CLUSTERS_TEXT);
  const filterOptions = [
    {
      key: 'faults',
      label: text.faultsOnly,
      pressed: faultsOnly,
      onPress: () => onFaultsOnly(true),
    },
    { key: 'all', label: text.all, pressed: !faultsOnly, onPress: () => onFaultsOnly(false) },
  ];
  const sortOptions = SORTS.map((option) => ({
    key: option,
    label: text.sort[option],
    pressed: sort === option,
    onPress: () => onSort(option),
  }));
  return (
    <div className="wb-toolbar">
      <SegmentControl id="cluster-filter-label" label={text.filterLabel} options={filterOptions} />
      <SegmentControl id="cluster-sort-label" label={text.sortLabel} options={sortOptions} />
      <p className="wb-summary" role="status">
        {summary}
      </p>
    </div>
  );
}
