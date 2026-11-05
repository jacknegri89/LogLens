import type { ReactNode } from 'react';

import { CopyButton } from '../../../components/CopyButton';
import { LAB_TEXT } from '../../../content/workbenchLab';
import { useText } from '../../../i18n/useText';
import {
  formatNewSignatures,
  hasDifferences,
  type DiffResult,
  type LogSummary,
  type SignatureChange,
  type SignatureShift,
} from './compareLogs';

/** Past this many rows a list stops being readable; the heading still shows the real total. */
const MAX_LISTED_SIGNATURES = 100;

export function DiffResults({ result }: { result: DiffResult }) {
  const text = useText(LAB_TEXT).diff;

  return (
    <div className="lab-stack" role="region" aria-label={text.summaryHeading}>
      <SummaryTable baseline={result.baseline} canary={result.canary} />
      {!hasDifferences(result) && <p className="lab-status lab-count">{text.noDifferences}</p>}
      <SignatureSection heading={text.newHeading} items={result.added}>
        {result.added.length > 0 && <CopyNewButton result={result} />}
      </SignatureSection>
      <SignatureSection heading={text.removedHeading} items={result.removed} />
      <SignatureSection heading={text.shiftedHeading} items={result.shifted} />
    </div>
  );
}

function CopyNewButton({ result }: { result: DiffResult }) {
  const text = useText(LAB_TEXT);
  return (
    <CopyButton
      text={formatNewSignatures(result)}
      label={text.diff.copyNew}
      copiedLabel={text.copied}
      className="lab-button"
    />
  );
}

function SummaryTable({ baseline, canary }: { baseline: LogSummary; canary: LogSummary }) {
  const text = useText(LAB_TEXT).diff;
  const rows: Array<[string, number, number]> = [
    [text.summaryLabels.lines, baseline.lineCount, canary.lineCount],
    [text.summaryLabels.faults, baseline.faultCount, canary.faultCount],
    [text.summaryLabels.signatures, baseline.signatureCount, canary.signatureCount],
  ];

  return (
    <table className="lab-table">
      <caption className="lab-label">{text.summaryHeading}</caption>
      <thead>
        <tr>
          <td />
          <th scope="col">{text.baselineShort}</th>
          <th scope="col">{text.canaryShort}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([label, before, after]) => (
          <tr key={label}>
            <th scope="row">{label}</th>
            <td>{before}</td>
            <td>{after}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

interface SignatureSectionProps {
  heading: string;
  items: Array<SignatureChange | SignatureShift>;
  children?: ReactNode;
}

function SignatureSection({ heading, items, children }: SignatureSectionProps) {
  const text = useText(LAB_TEXT).diff;
  return (
    <section className="lab-card">
      <div className="lab-card-head">
        <h3 className="lab-label">
          {heading} ({items.length})
        </h3>
        {children}
      </div>
      {items.length === 0 && <p className="lab-note">{text.none}</p>}
      {items.length > 0 && (
        <ul className="lab-signatures">
          {items.slice(0, MAX_LISTED_SIGNATURES).map((item) => (
            <SignatureRow key={item.signature} item={item} />
          ))}
        </ul>
      )}
      {items.length > MAX_LISTED_SIGNATURES && (
        <p className="lab-note">{text.moreHidden(items.length - MAX_LISTED_SIGNATURES)}</p>
      )}
    </section>
  );
}

function SignatureRow({ item }: { item: SignatureChange | SignatureShift }) {
  const text = useText(LAB_TEXT).diff;
  let direction: string | null = null;
  if ('direction' in item) {
    direction = text.direction[item.direction];
  }

  return (
    <li className="lab-signature">
      <p className="lab-signature-template">
        {item.isFault && <span className="lab-badge">{text.fault}</span>}
        <code>{item.signature}</code>
      </p>
      <p className="lab-note">
        {direction && `${direction}. `}
        {text.counts(item.baselineCount, item.canaryCount)}
      </p>
      <p className="lab-sample" title={text.sample}>
        <span className="lab-visually-hidden">{text.sample}: </span>
        {item.sample.slice(0, 300)}
      </p>
    </li>
  );
}
