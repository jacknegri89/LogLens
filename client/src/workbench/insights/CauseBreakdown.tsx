import { INSIGHTS_TEXT } from '../../content/workbenchInsights';
import { useText } from '../../i18n/useText';
import type { CauseConfidence } from './confidence';

/** How each cause got its points, so the percentages can be checked by hand. */
export function CauseBreakdown({ causes }: { causes: CauseConfidence[] }) {
  const text = useText(INSIGHTS_TEXT).causes;
  const columns = text.columns;
  return (
    <details className="insights-disclosure">
      <summary>{text.how}</summary>
      <ul className="insights-steps">
        {text.howSteps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ul>
      <div className="insights-table-scroll">
        <table className="insights-table">
          <thead>
            <tr>
              <th scope="col">{columns.cause}</th>
              <th scope="col">{columns.position}</th>
              <th scope="col">{columns.evidence}</th>
              <th scope="col">{columns.rootCause}</th>
              <th scope="col">{columns.confirmation}</th>
              <th scope="col">{columns.points}</th>
            </tr>
          </thead>
          <tbody>
            {causes.map((item) => (
              <BreakdownRow key={item.index} item={item} label={text.rowLabel(item.index + 1)} />
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

function BreakdownRow({ item, label }: { item: CauseConfidence; label: string }) {
  const { position, evidenceTerms, rootCause, corroboration } = item.breakdown;
  return (
    <tr>
      <th scope="row">{label}</th>
      <td>{position}</td>
      <td>{evidenceTerms}</td>
      <td>{rootCause}</td>
      <td>{corroboration}</td>
      <td>{item.points}</td>
    </tr>
  );
}
