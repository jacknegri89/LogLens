import { defineText } from '../i18n/defineText';
import { withCount } from '../i18n/plural';
import type { Severity, TimelineEntry } from '../lib/types';

/** Text of the report shown after an analysis: a case file on the investigator's desk. */
export const REPORT_TEXT = defineText({
  en: {
    caseFile: 'Case file',
    caseNumber: (id: string) => `No. ${id.slice(0, 8).toUpperCase()}`,
    caseTitleLabel: 'What failed',
    severityStamp: 'Severity',
    bigPicture: 'Case summary',
    evidenceBoard: 'Evidence board',
    evidenceBoardHint:
      'Red thread: from the event that started it to what it set off. Cards without a pin had no link to the rest.',
    evidenceTag: (index: number) => `E${index + 1}`,
    evidenceTagLabel: (index: number) => `Evidence ${index + 1}`,
    noTime: 'no time',
    allFindings: 'All findings',
    techniqueLabel: 'MITRE ATT&CK',
    owaspLabel: 'OWASP',
    failingLines: 'Failing lines',
    failingLinesLabel: 'Failing lines of the log; scroll sideways to read long lines',
    probableCauses: 'Probable causes',
    debugSteps: 'Debug steps',
    githubIssue: 'GitHub issue',
    githubIssueHint: 'A ready-to-paste bug report with the lines, causes and steps above.',
    copyIssue: 'Copy GitHub issue',
    copiedIssue: 'Copied',
    downloadMarkdown: 'Download .md',
    showMarkdown: (lines: number) => `Show markdown (${withCount(lines, ['line', 'lines'])})`,
    // The note under each evidence card: where it sits in the chain of events.
    roleLabels: {
      root: 'Root cause',
      effect: 'Effect',
      independent: 'No link found',
    } satisfies Record<TimelineEntry['role'], string>,
    // Shown on an effect card when its cause is known, such as "Set off by E1".
    causedBy: (rootIndex: number) => `Set off by E${rootIndex + 1}`,
    severityLabels: {
      critical: 'Critical',
      high: 'High',
      medium: 'Medium',
      low: 'Low',
      informational: 'Informational',
    } satisfies Record<Severity, string>,
  },
  it: {
    caseFile: 'Fascicolo',
    caseNumber: (id: string) => `N. ${id.slice(0, 8).toUpperCase()}`,
    caseTitleLabel: 'Cosa si è rotto',
    severityStamp: 'Gravità',
    bigPicture: 'Riepilogo del caso',
    evidenceBoard: 'Bacheca dei reperti',
    evidenceBoardHint:
      "Filo rosso: dall'evento che ha innescato tutto a ciò che ne è seguito. Le schede senza spillo non hanno legami con il resto.",
    evidenceTag: (index: number) => `R${index + 1}`,
    evidenceTagLabel: (index: number) => `Reperto ${index + 1}`,
    noTime: 'senza orario',
    allFindings: 'Tutti i problemi rilevati',
    techniqueLabel: 'MITRE ATT&CK',
    owaspLabel: 'OWASP',
    failingLines: 'Righe che falliscono',
    failingLinesLabel: 'Righe che falliscono del log; scorri di lato per leggere le righe lunghe',
    probableCauses: 'Cause probabili',
    debugSteps: 'Passi di debug',
    githubIssue: 'Issue GitHub',
    githubIssueHint:
      'Una segnalazione pronta da incollare, con le righe, le cause e i passi qui sopra.',
    copyIssue: 'Copia issue GitHub',
    copiedIssue: 'Copiato',
    downloadMarkdown: 'Scarica .md',
    showMarkdown: (lines: number) => `Mostra markdown (${withCount(lines, ['riga', 'righe'])})`,
    roleLabels: {
      root: 'Causa radice',
      effect: 'Effetto',
      independent: 'Nessun legame trovato',
    } satisfies Record<TimelineEntry['role'], string>,
    causedBy: (rootIndex: number) => `Innescato da R${rootIndex + 1}`,
    severityLabels: {
      critical: 'Critica',
      high: 'Alta',
      medium: 'Media',
      low: 'Bassa',
      informational: 'Informativa',
    } satisfies Record<Severity, string>,
  },
});
