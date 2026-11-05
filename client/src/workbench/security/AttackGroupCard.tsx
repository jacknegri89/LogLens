import { useId } from 'react';

import { SECURITY_TEXT } from '../../content/workbenchSecurity';
import { useText } from '../../i18n/useText';
import { useWorkbench } from '../core/useWorkbench';
import { findLinePosition } from '../inspector/linePosition';
import type { AttackGroup } from './scan/types';

/** One kind of attack: what it is, how serious, who sent it and a few lines to click. */
export function AttackGroupCard({ group }: { group: AttackGroup }) {
  const text = useText(SECURITY_TEXT).panel;
  const titleId = useId();
  const info = text.types[group.type];

  return (
    <article aria-labelledby={titleId} className="sec-card" data-severity={group.severity}>
      <header className="sec-card-head">
        <h3 id={titleId} className="sec-card-title">
          {info.title}
        </h3>
        <span className="sec-severity">{text.severity[group.severity]}</span>
        <span className="sec-count">{text.lines(group.count)}</span>
      </header>
      <p className="sec-card-text">{info.description}</p>
      <ul className="sec-tags">
        <li>
          {text.owaspLabel}: {text.owasp[group.owasp]}
        </li>
        <li>
          {text.mitreLabel}: {text.mitre[group.mitre as keyof typeof text.mitre] ?? group.mitre}
        </li>
      </ul>
      <TopAddresses group={group} />
      <SampleLines group={group} />
    </article>
  );
}

function TopAddresses({ group }: { group: AttackGroup }) {
  const text = useText(SECURITY_TEXT).panel;
  if (group.topAddresses.length === 0) {
    return <p className="sec-muted">{text.noAddress}</p>;
  }

  return (
    <div>
      <p className="sec-label">{text.topAddresses}</p>
      <ul className="sec-addresses">
        {group.topAddresses.map((entry) => (
          <li key={entry.address}>
            <code>{entry.address}</code> <span>×{entry.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SampleLines({ group }: { group: AttackGroup }) {
  const text = useText(SECURITY_TEXT).panel;
  const { lines, select } = useWorkbench();

  return (
    <div>
      <p className="sec-label">{text.samples}</p>
      <ul className="sec-samples">
        {group.samples.map((index) => (
          <li key={index}>
            <button
              type="button"
              onClick={() => select(index)}
              aria-label={text.openLine(index + 1)}
              className="sec-sample"
            >
              <span className="sec-sample-number">{index + 1}</span>
              <span className="sec-sample-text">{lines[findLinePosition(lines, index)]?.raw}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
