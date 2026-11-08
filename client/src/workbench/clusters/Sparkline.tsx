import { CLUSTERS_TEXT } from '../../content/workbenchInspect';
import { useText } from '../../i18n/useText';

const WIDTH = 120;
const HEIGHT = 28;

/** Frequency over time as small bars. The scale is the peak of this cluster, so a quiet one still shows its shape. */
export function Sparkline({ counts, byTime }: { counts: readonly number[]; byTime: boolean }) {
  const text = useText(CLUSTERS_TEXT);
  const peak = Math.max(1, ...counts);
  const slot = WIDTH / counts.length;
  return (
    <svg
      className="cluster-spark"
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={text.sparkline(byTime, peak)}
    >
      <line x1="0" x2={WIDTH} y1={HEIGHT - 0.5} y2={HEIGHT - 0.5} strokeWidth="1" />
      {counts.map((count, position) => {
        if (count === 0) {
          return null;
        }
        return (
          <rect
            key={position}
            x={position * slot + 0.5}
            width={Math.max(1, slot - 1)}
            y={HEIGHT - Math.max(2, (count / peak) * (HEIGHT - 2))}
            height={Math.max(2, (count / peak) * (HEIGHT - 2))}
          />
        );
      })}
    </svg>
  );
}
