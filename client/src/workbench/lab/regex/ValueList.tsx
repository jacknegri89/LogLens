import { CopyButton } from '../../../components/CopyButton';
import { LAB_TEXT } from '../../../content/workbenchLab';
import { useText } from '../../../i18n/useText';
import { findExtractor, maskSecret, type ExtractorId } from './extractors';
import { summarizeLatencies } from './latencyStats';
import type { ScanSnapshot, ValueCount } from './regexScan';

interface ValueListProps {
  snapshot: ScanSnapshot;
  extractorId: ExtractorId | null;
}

function displayedValues(values: ValueCount[], extractorId: ExtractorId | null): ValueCount[] {
  if (!extractorId || !findExtractor(extractorId).maskValues) return values;
  const merged = new Map<string, number>();
  for (const { value, count } of values) {
    const shown = maskSecret(value);
    merged.set(shown, (merged.get(shown) ?? 0) + count);
  }
  return [...merged].map(([value, count]) => ({ value, count }));
}

export function ValueList({ snapshot, extractorId }: ValueListProps) {
  const text = useText(LAB_TEXT);
  const masked = extractorId !== null && findExtractor(extractorId).maskValues;
  const values = displayedValues(snapshot.values, extractorId);
  const copyText = values.map((item) => `${item.count}\t${item.value}`).join('\n');

  return (
    <section className="lab-card" aria-labelledby="lab-values-heading">
      <div className="lab-card-head">
        <h3 id="lab-values-heading" className="lab-label">
          {text.regex.valuesHeading}
        </h3>
        <CopyButton
          text={copyText}
          label={text.regex.copyValues}
          copiedLabel={text.copied}
          className="lab-button"
        />
      </div>
      {masked && <p className="lab-note">{text.regex.maskedNote}</p>}
      {extractorId === 'latencies' && <LatencySummary snapshot={snapshot} />}
      <ul className="lab-values" aria-label={text.regex.valuesLabel}>
        {values.map((item) => (
          <li key={item.value} className="lab-value">
            <span className="lab-value-count">{item.count}</span>
            <code className="lab-value-text">{item.value}</code>
          </li>
        ))}
      </ul>
    </section>
  );
}

function LatencySummary({ snapshot }: { snapshot: ScanSnapshot }) {
  const text = useText(LAB_TEXT).regex.latency;
  const summary = summarizeLatencies(snapshot.valueCounts);
  if (!summary) return null;
  const cells: Array<[string, number]> = [
    [text.min, summary.min],
    [text.average, summary.average],
    [text.p95, summary.p95],
    [text.max, summary.max],
  ];

  return (
    <dl className="lab-stats" aria-label={text.heading}>
      {cells.map(([label, value]) => (
        <div key={label} className="lab-stat">
          <dt>{label}</dt>
          <dd>
            {Math.round(value * 10) / 10} {text.unit}
          </dd>
        </div>
      ))}
    </dl>
  );
}
