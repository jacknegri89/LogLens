import { defineText } from '../i18n/defineText';
import { withCount } from '../i18n/plural';
import type { IncidentTimelineEntry, RootCauseStatus } from '../lib/types';

/** Text of the incident part of the report: root cause, evidence, timeline, engine and warnings. */
export const INCIDENTS_TEXT = defineText({
  en: {
    incidents: 'Incidents',
    incidentsHint:
      'Each incident is a set of failures the log ties together. The root cause says how sure the analysis is; every line below links to the original log.',
    noIncidents: 'No incident was found in this log.',
    rootCause: 'Root cause',
    statusLabels: {
      confirmed: 'Confirmed',
      probable: 'Probable',
      unverified: 'Unverified hypothesis',
      insufficient: 'Insufficient information',
    } satisfies Record<RootCauseStatus, string>,
    statusHints: {
      confirmed: 'The log itself shows the cause and its effects.',
      probable: 'The best explanation; one step of the chain is inferred.',
      unverified: 'A hypothesis to check; the log supports it only weakly.',
      insufficient: 'The log shows the failure but not what caused it.',
    } satisfies Record<RootCauseStatus, string>,
    confidence: 'Confidence',
    confidenceLevels: { high: 'High', medium: 'Medium', low: 'Low' },
    reasoning: 'Reasoning',
    speaksAgainst: 'Speaks against it',
    alternatives: 'Other explanations considered',
    evidence: 'Evidence',
    lineLabel: (start: number, end: number) => {
      if (end > start) {
        return `lines ${start}-${end}`;
      }
      return `line ${start}`;
    },
    openLine: (start: number) => `Open line ${start} in the original log`,
    impact: 'Impact',
    observed: 'Observed',
    potential: 'Potential, not observed',
    severityWhy: 'Why this severity',
    timeline: 'Timeline',
    timelineCount: (count: number) => withCount(count, ['event', 'events']),
    timelineRoles: {
      cause: 'Cause',
      symptom: 'Symptom',
      context: 'Context',
      independent: 'Independent',
    } satisfies Record<IncidentTimelineEntry['role'], string>,
    setOffBy: (line: number) => `set off by line ${line}`,
    secondarySymptoms: 'Secondary symptoms',
    moreSymptoms: (count: number) => `and ${withCount(count, ['more event', 'more events'])}`,
    immediateActions: 'Immediate actions',
    permanentFix: 'Permanent fix',
    preventive: 'Preventive measures',
    engineTitle: 'How this was analysed',
    engineRules: 'Rules engine. No AI was used.',
    engineMock: 'Demo engine. No AI was used.',
    engineAi: (used: string) => `AI-assisted (${used}), checked against the log.`,
    engineFallback: (reason: string) => `No AI was used: ${reason}.`,
    complexityLabel: (complex: boolean) => {
      if (complex) {
        return 'Complex log: several events had to be tied together.';
      }
      return 'Simple log.';
    },
    partialTitle: 'Partial analysis',
    partialBody: (events: number) =>
      `${withCount(events, ['event was', 'events were'])} not analysed. The conclusions cover only what was analysed.`,
    limitLabels: {
      'records-not-acquired': 'records that could not be read',
      'cut-by-budget': 'events cut by the size limit',
      'identifier-cap': 'events cut from a very frequent identifier',
      'change-cap': 'changes beyond the limit',
    } as Record<string, string>,
    injectionTitle: 'Text aimed at the analyser',
    injectionBody:
      'These lines try to give orders to whoever reads the log. They were reported here and not obeyed.',
    validationNote: (count: number) => {
      if (count === 1) {
        return '1 claim was corrected or removed because the log does not support it.';
      }
      return `${count} claims were corrected or removed because the log does not support them.`;
    },
  },
  it: {
    incidents: 'Incidenti',
    incidentsHint:
      "Ogni incidente è un insieme di guasti che il log collega tra loro. La causa radice dice quanto è sicura l'analisi; ogni riga qui sotto rimanda al log originale.",
    noIncidents: 'Nessun incidente trovato in questo log.',
    rootCause: 'Causa radice',
    statusLabels: {
      confirmed: 'Confermata',
      probable: 'Probabile',
      unverified: 'Ipotesi non verificata',
      insufficient: 'Informazioni insufficienti',
    } satisfies Record<RootCauseStatus, string>,
    statusHints: {
      confirmed: 'Il log stesso mostra la causa e i suoi effetti.',
      probable: 'La spiegazione migliore; un passaggio della catena è dedotto.',
      unverified: 'Un’ipotesi da verificare; il log la sostiene solo debolmente.',
      insufficient: 'Il log mostra il guasto ma non ciò che lo ha causato.',
    } satisfies Record<RootCauseStatus, string>,
    confidence: 'Affidabilità',
    confidenceLevels: { high: 'Alta', medium: 'Media', low: 'Bassa' },
    reasoning: 'Ragionamento',
    speaksAgainst: 'Va contro questa causa',
    alternatives: 'Altre spiegazioni considerate',
    evidence: 'Prove',
    lineLabel: (start: number, end: number) => {
      if (end > start) {
        return `righe ${start}-${end}`;
      }
      return `riga ${start}`;
    },
    openLine: (start: number) => `Apri la riga ${start} nel log originale`,
    impact: 'Impatto',
    observed: 'Osservato',
    potential: 'Potenziale, non osservato',
    severityWhy: 'Perché questa gravità',
    timeline: 'Cronologia',
    timelineCount: (count: number) => withCount(count, ['evento', 'eventi']),
    timelineRoles: {
      cause: 'Causa',
      symptom: 'Sintomo',
      context: 'Contesto',
      independent: 'Indipendente',
    } satisfies Record<IncidentTimelineEntry['role'], string>,
    setOffBy: (line: number) => `innescato dalla riga ${line}`,
    secondarySymptoms: 'Sintomi secondari',
    moreSymptoms: (count: number) => `e altri ${withCount(count, ['evento', 'eventi'])}`,
    immediateActions: 'Azioni immediate',
    permanentFix: 'Correzione definitiva',
    preventive: 'Misure preventive',
    engineTitle: 'Come è stato analizzato',
    engineRules: 'Motore a regole. Nessuna AI usata.',
    engineMock: 'Motore dimostrativo. Nessuna AI usata.',
    engineAi: (used: string) => `Assistito da AI (${used}), verificato sul log.`,
    engineFallback: (reason: string) => `Nessuna AI usata: ${reason}.`,
    complexityLabel: (complex: boolean) => {
      if (complex) {
        return 'Log complesso: è stato necessario collegare più eventi.';
      }
      return 'Log semplice.';
    },
    partialTitle: 'Analisi parziale',
    partialBody: (events: number) =>
      `${withCount(events, ['evento non è stato analizzato', 'eventi non sono stati analizzati'])}. Le conclusioni valgono solo per ciò che è stato analizzato.`,
    limitLabels: {
      'records-not-acquired': 'record che non è stato possibile leggere',
      'cut-by-budget': 'eventi tagliati dal limite di dimensione',
      'identifier-cap': 'eventi tagliati da un identificatore molto frequente',
      'change-cap': 'modifiche oltre il limite',
    } as Record<string, string>,
    injectionTitle: "Testo rivolto all'analizzatore",
    injectionBody:
      'Queste righe cercano di dare ordini a chi legge il log. Sono state segnalate qui e non eseguite.',
    validationNote: (count: number) =>
      `${withCount(count, ['affermazione è stata corretta o rimossa', 'affermazioni sono state corrette o rimosse'])} perché il log non la sostiene.`,
  },
});
