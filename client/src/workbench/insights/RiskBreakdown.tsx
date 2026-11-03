import { INSIGHTS_TEXT } from '../../content/workbenchInsights';
import { useText } from '../../i18n/useText';
import type { RiskAssessment, RiskFactor } from './risk';

type FactorDetails = (typeof INSIGHTS_TEXT)['en']['risk']['factorDetails'];

function describeFactor(factor: RiskFactor, details: FactorDetails, severityLabel: string): string {
  switch (factor.id) {
    case 'severity':
      return details.severity(severityLabel);
    case 'faultRatio':
      return details.faultRatio(factor.value);
    case 'findings':
      return details.findings(factor.value);
    case 'rootCause':
      return details.rootCause(factor.value);
    case 'security':
      return details.security(factor.value);
    case 'burst':
      return details.burst(factor.value);
  }
}

interface RiskBreakdownProps {
  risk: RiskAssessment;
  severityLabel: string;
}

/** Every factor of the score with its points: the number is a sum anyone can check. */
export function RiskBreakdown({ risk, severityLabel }: RiskBreakdownProps) {
  const text = useText(INSIGHTS_TEXT).risk;
  return (
    <details className="insights-disclosure">
      <summary>{text.how}</summary>
      <p>{text.howIntro}</p>
      <ul className="insights-factors">
        {risk.factors.map((factor) => (
          <li key={factor.id} data-active={factor.points > 0}>
            <span>
              <strong>{text.factorLabels[factor.id]}</strong>
              <span className="insights-factor-detail">
                {describeFactor(factor, text.factorDetails, severityLabel)}
              </span>
            </span>
            <span className="insights-points">{text.points(factor.points, factor.maxPoints)}</span>
          </li>
        ))}
      </ul>
      <p className="insights-factor-total">
        <strong>{text.total}</strong> {risk.score}
        {risk.rawScore > risk.score && <span> ({text.capped(risk.rawScore)})</span>}
      </p>
    </details>
  );
}
