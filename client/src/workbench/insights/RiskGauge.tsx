import type { RiskLevel } from './risk';

interface RiskGaugeProps {
  score: number;
  level: RiskLevel;
}

const ARC = 'M 12 62 A 48 48 0 0 1 108 62';

/** A half-circle dial. The SVG is decoration: the number and the level are also written as text. */
export function RiskGauge({ score, level }: RiskGaugeProps) {
  return (
    <svg viewBox="0 0 120 72" aria-hidden="true" className="insights-gauge" data-level={level}>
      <path d={ARC} pathLength={100} className="insights-gauge-track" />
      {score > 0 && (
        <path
          d={ARC}
          pathLength={100}
          className="insights-gauge-value"
          style={{ strokeDasharray: `${score} 100` }}
        />
      )}
      <text x="60" y="58" textAnchor="middle" className="insights-gauge-number">
        {score}
      </text>
    </svg>
  );
}
