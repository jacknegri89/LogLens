import { INSIGHTS_TEXT } from '../../content/workbenchInsights';
import { useText } from '../../i18n/useText';
import { FlameChart } from './FlameChart';
import { FlameTable } from './FlameTable';
import type { FlameNode } from './flamegraph';
import { InsightSection } from './InsightSection';
import { LatencyStats } from './LatencyStats';
import type { LatencySummary } from './latency';

interface FlamegraphSectionProps {
  tree: FlameNode | null;
  latency: LatencySummary | null;
}

/** Where the time went, from the latencies written in the log. It needs no analysis. */
export function FlamegraphSection({ tree, latency }: FlamegraphSectionProps) {
  const text = useText(INSIGHTS_TEXT);
  return (
    <InsightSection title={text.sections.latency}>
      <p className="insights-note">{text.flame.intro}</p>
      {latency && <LatencyStats summary={latency} />}
      {tree ? (
        <>
          <FlameChart tree={tree} />
          <FlameTable tree={tree} />
        </>
      ) : (
        <p className="insights-note">{text.flame.empty}</p>
      )}
    </InsightSection>
  );
}
