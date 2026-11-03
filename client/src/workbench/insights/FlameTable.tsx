import { INSIGHTS_TEXT } from '../../content/workbenchInsights';
import { useText } from '../../i18n/useText';
import { flameLabel } from './flameLabels';
import type { FlameNode } from './flamegraph';
import { formatMilliseconds } from './latency';

/** The same figures as the chart in a table that only screen readers see. */
export function FlameTable({ tree }: { tree: FlameNode }) {
  const text = useText(INSIGHTS_TEXT).flame;
  const columns = text.tableColumns;
  return (
    <table className="sr-only">
      <caption>{text.tableCaption}</caption>
      <thead>
        <tr>
          <th scope="col">{columns.name}</th>
          <th scope="col">{columns.total}</th>
          <th scope="col">{columns.count}</th>
          <th scope="col">{columns.max}</th>
          <th scope="col">{columns.share}</th>
        </tr>
      </thead>
      <tbody>
        {tree.children
          .flatMap((service) => [service, ...service.children])
          .map((node) => (
            <tr key={node.id}>
              <th scope="row">{flameLabel(node, text)}</th>
              <td>{formatMilliseconds(node.total)}</td>
              <td>{node.count}</td>
              <td>{formatMilliseconds(node.max)}</td>
              <td>{text.sharePercent(node.share)}</td>
            </tr>
          ))}
      </tbody>
    </table>
  );
}
