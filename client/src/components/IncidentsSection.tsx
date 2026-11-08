import { INCIDENTS_TEXT } from '../content/incidents';
import { useText } from '../i18n/useText';
import type { Incident, IncidentTimelineEntry, ReportEvidence } from '../lib/types';
import { LineLink } from './LineLink';
import { ReportSection } from './ReportSection';
import { SeverityBadge } from './SeverityBadge';

/** How many secondary symptoms are listed before "and N more": the full list is in the timeline. */
const SYMPTOMS_SHOWN = 5;

interface IncidentsSectionProps {
  incidents: Incident[];
  /** True when the raw log is on the page, so evidence lines can be opened. */
  hasLog: boolean;
}

/** Every incident of the log, each with its root cause, evidence, timeline, impact and actions. */
export function IncidentsSection({ incidents, hasLog }: IncidentsSectionProps) {
  const text = useText(INCIDENTS_TEXT);
  if (incidents.length === 0) {
    return null;
  }
  return (
    <ReportSection title={text.incidents} hint={text.incidentsHint}>
      <ol className="incident-list">
        {incidents.map((incident) => (
          <IncidentCard key={incident.id} incident={incident} hasLog={hasLog} />
        ))}
      </ol>
    </ReportSection>
  );
}

function IncidentCard({ incident, hasLog }: { incident: Incident; hasLog: boolean }) {
  const text = useText(INCIDENTS_TEXT);
  const headingId = `incident-${incident.id}`;
  return (
    <li className="incident-card evidence-sheet" aria-labelledby={headingId}>
      <header className="incident-head">
        <h4 className="incident-title" id={headingId}>
          <span className="incident-id">{incident.id}</span> {incident.title}
        </h4>
        <SeverityBadge severity={incident.severity} />
      </header>
      <p className="incident-category">
        {incident.category} · {incident.description}
      </p>
      <RootCauseBlock incident={incident} hasLog={hasLog} />
      <ImpactBlock incident={incident} />
      <TimelineBlock incident={incident} hasLog={hasLog} />
      <SymptomsBlock symptoms={incident.secondarySymptoms} hasLog={hasLog} />
      <ActionBlock title={text.immediateActions} items={incident.immediateActions} />
      <ActionBlock title={text.permanentFix} items={incident.permanentFix} />
      <ActionBlock title={text.preventive} items={incident.preventiveMeasures} />
    </li>
  );
}

function RootCauseBlock({ incident, hasLog }: { incident: Incident; hasLog: boolean }) {
  const text = useText(INCIDENTS_TEXT);
  const { rootCause, confidence } = incident;
  return (
    <section className="incident-cause" data-status={rootCause.status}>
      <h5 className="incident-label">{text.rootCause}</h5>
      <p className="incident-status">
        <span className="incident-status-chip" data-status={rootCause.status}>
          {text.statusLabels[rootCause.status]}
        </span>
        <span className="incident-status-hint">{text.statusHints[rootCause.status]}</span>
      </p>
      <p className="incident-summary">{rootCause.summary}</p>
      {rootCause.reasoning && <p className="incident-reasoning">{rootCause.reasoning}</p>}
      <details className="incident-more">
        <summary>
          {text.confidence}: {text.confidenceLevels[confidence.level]}
        </summary>
        <ul className="incident-bullets">
          {confidence.criteria.map((criterion) => (
            <li key={criterion}>{criterion}</li>
          ))}
        </ul>
        <p className="incident-label">{text.severityWhy}</p>
        <ul className="incident-bullets">
          {incident.severityReasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      </details>
      {rootCause.contradicting.length > 0 && (
        <>
          <p className="incident-label">{text.speaksAgainst}</p>
          <ul className="incident-bullets">
            {rootCause.contradicting.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </>
      )}
      <EvidenceList evidence={rootCause.evidence} hasLog={hasLog} />
      {rootCause.alternatives.length > 0 && (
        <>
          <p className="incident-label">{text.alternatives}</p>
          <ul className="incident-bullets">
            {rootCause.alternatives.map((alternative) => (
              <li key={alternative.summary}>
                {text.statusLabels[alternative.status]}: {alternative.summary}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function EvidenceList({ evidence, hasLog }: { evidence: ReportEvidence[]; hasLog: boolean }) {
  const text = useText(INCIDENTS_TEXT);
  if (evidence.length === 0) {
    return null;
  }
  return (
    <>
      <p className="incident-label">{text.evidence}</p>
      <ul className="incident-evidence">
        {evidence.map((item) => (
          <li key={item.eventId}>
            <LineLink start={item.lineStart} end={item.lineEnd} enabled={hasLog} />
            <code className="incident-quote">{item.quote}</code>
            {item.note && <span className="incident-note">{item.note}</span>}
          </li>
        ))}
      </ul>
    </>
  );
}

function ImpactBlock({ incident }: { incident: Incident }) {
  const text = useText(INCIDENTS_TEXT);
  const { impact } = incident;
  return (
    <section className="incident-impact">
      <h5 className="incident-label">{text.impact}</h5>
      <p className="incident-sublabel">{text.observed}</p>
      <ul className="incident-bullets">
        {impact.observed.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      {impact.potential.length > 0 && (
        <>
          <p className="incident-sublabel">{text.potential}</p>
          <ul className="incident-bullets" data-potential="true">
            {impact.potential.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function causeLine(entry: IncidentTimelineEntry, entries: IncidentTimelineEntry[]): number | null {
  if (entry.causedBy === undefined) {
    return null;
  }
  const cause = entries.find((candidate) => candidate.eventId === entry.causedBy);
  if (cause === undefined) {
    return null;
  }
  return cause.lineStart;
}

function TimelineBlock({ incident, hasLog }: { incident: Incident; hasLog: boolean }) {
  const text = useText(INCIDENTS_TEXT);
  const { timeline } = incident;
  if (timeline.length === 0) {
    return null;
  }
  return (
    <details className="incident-timeline">
      <summary>
        {text.timeline} · {text.timelineCount(timeline.length)}
      </summary>
      <ol className="incident-timeline-list">
        {timeline.map((entry) => {
          const origin = causeLine(entry, timeline);
          return (
            <li key={entry.eventId} data-role={entry.role}>
              <span className="incident-role">{text.timelineRoles[entry.role]}</span>
              <LineLink start={entry.lineStart} end={entry.lineStart} enabled={hasLog} />
              {entry.time && <time className="incident-time">{entry.time}</time>}
              {entry.service && <span className="incident-service">{entry.service}</span>}
              <span className="incident-event">{entry.title}</span>
              {origin !== null && <span className="incident-note">{text.setOffBy(origin)}</span>}
            </li>
          );
        })}
      </ol>
    </details>
  );
}

function SymptomsBlock({ symptoms, hasLog }: { symptoms: ReportEvidence[]; hasLog: boolean }) {
  const text = useText(INCIDENTS_TEXT);
  if (symptoms.length === 0) {
    return null;
  }
  const shown = symptoms.slice(0, SYMPTOMS_SHOWN);
  const hidden = symptoms.length - shown.length;
  return (
    <section className="incident-symptoms">
      <h5 className="incident-label">{text.secondarySymptoms}</h5>
      <ul className="incident-evidence">
        {shown.map((item) => (
          <li key={item.eventId}>
            <LineLink start={item.lineStart} end={item.lineEnd} enabled={hasLog} />
            <code className="incident-quote">{item.quote}</code>
          </li>
        ))}
      </ul>
      {hidden > 0 && <p className="incident-note">{text.moreSymptoms(hidden)}</p>}
    </section>
  );
}

function ActionBlock({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) {
    return null;
  }
  return (
    <section className="incident-actions">
      <h5 className="incident-label">{title}</h5>
      <ul className="incident-bullets">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}
