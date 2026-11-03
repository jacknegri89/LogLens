import { REPORT_TEXT } from '../content/report';
import type { Finding } from '../lib/types';
import { SeverityBadge } from './SeverityBadge';

/** Every distinct problem of the log, most severe first, one paper row each. */
export function FindingsList({ findings }: { findings: Finding[] }) {
  return (
    <ol className="bands py-1 text-ink">
      {findings.map((finding, index) => (
        <FindingRow key={index} finding={finding} />
      ))}
    </ol>
  );
}

function FindingRow({ finding }: { finding: Finding }) {
  return (
    <li className="flex flex-wrap items-start gap-x-5 gap-y-1 px-3 py-2">
      <span className="w-24 shrink-0">
        <SeverityBadge severity={finding.severity} />
      </span>
      <div className="min-w-0 flex-1 basis-56">
        <p className="flex flex-wrap items-baseline gap-x-3">
          <span className="text-[16px] font-bold break-words">{finding.title}</span>
          <span className="font-mono text-sm text-ink-soft">{finding.category}</span>
        </p>
        <p className="mt-1 font-mono text-[13.5px] leading-[22px] break-words">
          {finding.evidence}
        </p>
        <FindingChips technique={finding.technique} owasp={finding.owasp} />
      </div>
    </li>
  );
}

function FindingChips({ technique, owasp }: { technique?: string; owasp?: string }) {
  if (!technique && !owasp) return null;
  return (
    <p className="mt-1 flex flex-wrap gap-2">
      {technique && <Chip label={REPORT_TEXT.techniqueLabel} value={technique} />}
      {owasp && <Chip label={REPORT_TEXT.owaspLabel} value={owasp} />}
    </p>
  );
}

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <span className="border border-ink px-1.5 font-mono text-xs">
      <span className="text-ink-soft">{label}</span> <span className="font-bold">{value}</span>
    </span>
  );
}
