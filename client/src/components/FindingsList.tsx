import { REPORT_TEXT } from '../content/report';
import { useText } from '../i18n/useText';
import type { Finding } from '../lib/types';
import { SeverityBadge } from './SeverityBadge';

/** Every distinct problem of the log, most severe first: the exhibit register, one ruled row each. */
export function FindingsList({ findings }: { findings: Finding[] }) {
  return (
    <div className="report-register evidence-sheet">
      <span className="tape tape-left" aria-hidden="true" />
      <span className="tape tape-right" aria-hidden="true" />
      <ol className="report-register-list">
        {findings.map((finding, index) => (
          <FindingRow key={index} finding={finding} />
        ))}
      </ol>
    </div>
  );
}

function FindingRow({ finding }: { finding: Finding }) {
  return (
    <li className="report-register-row">
      <p className="report-register-head">
        <span className="report-register-title">{finding.title}</span>
        <SeverityBadge severity={finding.severity} />
      </p>
      <p className="report-register-category">{finding.category}</p>
      <p className="report-register-evidence">{finding.evidence}</p>
      <FindingTags technique={finding.technique} owasp={finding.owasp} />
    </li>
  );
}

function FindingTags({ technique, owasp }: { technique?: string; owasp?: string }) {
  const text = useText(REPORT_TEXT);
  if (!technique && !owasp) {
    return null;
  }
  return (
    <p className="report-tags">
      {technique && <ReferenceTag label={text.techniqueLabel} value={technique} />}
      {owasp && <ReferenceTag label={text.owaspLabel} value={owasp} />}
    </p>
  );
}

/** A small paper tag on a string: the framework, then the reference in it. */
function ReferenceTag({ label, value }: { label: string; value: string }) {
  return (
    <span className="report-tag">
      <span className="report-tag-label">{label}</span> <span>{value}</span>
    </span>
  );
}
