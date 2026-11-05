import { useMemo } from 'react';

import '../../styles/workbench-security.css';
import { SECURITY_TEXT } from '../../content/workbenchSecurity';
import { useText } from '../../i18n/useText';
import { useWorkbench } from '../core/useWorkbench';
import { AttackGroupCard } from './AttackGroupCard';
import { MitigationSection } from './MitigationSection';
import { scanLines } from './scan/scanLines';
import { ThreatBanner } from './ThreatBanner';

/** Scans the loaded log for attacks and offers the commands that block what it found. */
export function SecurityPanel() {
  const { lines } = useWorkbench();
  const text = useText(SECURITY_TEXT).panel;
  const result = useMemo(() => scanLines(lines), [lines]);
  let intro = text.intro;
  if (lines.length === 0) {
    intro = text.empty;
  }

  return (
    <section aria-labelledby="security-title" className="sec-panel">
      <h2 id="security-title" className="sec-title">
        {text.title}
      </h2>
      <p className="sec-intro">{intro}</p>
      {lines.length > 0 && (
        <>
          <ThreatBanner result={result} />
          <p className="sec-scanned">
            {text.scanned(result.scannedLines)}
            {result.groups.length === 0 && ` · ${text.clean}`}
          </p>
          <div className="sec-groups">
            {result.groups.map((group) => (
              <AttackGroupCard key={group.type} group={group} />
            ))}
          </div>
          <MitigationSection result={result} />
        </>
      )}
    </section>
  );
}
