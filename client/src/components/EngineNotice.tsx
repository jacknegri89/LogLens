import { INCIDENTS_TEXT } from '../content/incidents';
import type { TextOf } from '../i18n/defineText';
import { useText } from '../i18n/useText';
import type { AnalysisReport } from '../lib/types';
import { LineLink } from './LineLink';

type NoticeProps = Pick<
  AnalysisReport,
  'engine' | 'coverage' | 'validation' | 'promptInjection'
> & {
  /** True when the raw log is on the page, so a line can be opened. */
  hasLog: boolean;
};

/**
 * What the reader needs to know before trusting the report: which engine wrote it (and that no AI
 * was used when none was), whether the analysis is partial, whether a line tried to instruct the
 * analyser, and whether claims were removed for lack of support.
 */
export function EngineNotice({
  engine,
  coverage,
  validation,
  promptInjection,
  hasLog,
}: NoticeProps) {
  const text = useText(INCIDENTS_TEXT);
  if (!engine && !coverage && !promptInjection?.length) {
    return null;
  }
  return (
    <div className="incident-notices">
      {engine && <EngineLine engine={engine} />}
      {coverage && !coverage.complete && <PartialWarning coverage={coverage} />}
      {promptInjection && promptInjection.length > 0 && (
        <aside className="incident-notice" data-tone="warning" aria-label={text.injectionTitle}>
          <p className="incident-notice-title">{text.injectionTitle}</p>
          <p>{text.injectionBody}</p>
          <ul className="incident-notice-list">
            {promptInjection.map((attempt) => (
              <li key={attempt.eventId}>
                <LineLink start={attempt.lineStart} end={attempt.lineStart} enabled={hasLog} />{' '}
                <code>{attempt.quote}</code>
              </li>
            ))}
          </ul>
        </aside>
      )}
      {validation && validation.issues.length > 0 && (
        <p className="incident-notice incident-notice-plain">
          {text.validationNote(validation.issues.length)}
        </p>
      )}
    </div>
  );
}

function engineSentence(
  engine: NonNullable<AnalysisReport['engine']>,
  text: TextOf<typeof INCIDENTS_TEXT>,
) {
  if (engine.fallbackReason !== null) {
    return text.engineFallback(engine.fallbackReason);
  }
  if (engine.aiUsed) {
    return text.engineAi(engine.used);
  }
  if (engine.used === 'mock') {
    return text.engineMock;
  }
  return text.engineRules;
}

function EngineLine({ engine }: { engine: NonNullable<AnalysisReport['engine']> }) {
  const text = useText(INCIDENTS_TEXT);
  return (
    <p className="incident-notice incident-notice-plain" data-ai={engine.aiUsed}>
      <span className="incident-notice-label">{text.engineTitle}</span>{' '}
      {engineSentence(engine, text)} {text.complexityLabel(engine.complexity === 'complex')}
    </p>
  );
}

function PartialWarning({ coverage }: { coverage: NonNullable<AnalysisReport['coverage']> }) {
  const text = useText(INCIDENTS_TEXT);
  return (
    <aside className="incident-notice" data-tone="warning" role="note">
      <p className="incident-notice-title">{text.partialTitle}</p>
      <p>{text.partialBody(coverage.notAcquired + coverage.cutByBudget)}</p>
      <ul className="incident-notice-list">
        {coverage.limits.map((limit) => (
          <li key={limit.code}>
            {limit.count} {text.limitLabels[limit.code] ?? limit.code}
          </li>
        ))}
      </ul>
    </aside>
  );
}
