import { defineText } from '../i18n/defineText';
import { withCount } from '../i18n/plural';

/** Text of the Export view: the four formats, the share link, and the wording inside the documents. */
export const EXPORT_TEXT = defineText({
  en: {
    title: 'Export',
    intro: 'Turn the analysis into what your team uses: an issue, an alert, a post-mortem or data.',
    formatsLabel: 'Export format',
    formats: {
      github: { name: 'GitHub issue', hint: 'Markdown, ready to paste into a new issue.' },
      alert: {
        name: 'Slack and PagerDuty',
        hint: 'A Slack message and a PagerDuty Events API v2 payload.',
      },
      postmortem: { name: 'Post-mortem', hint: 'A Markdown report for people who read summaries.' },
      json: { name: 'JSON', hint: 'The analysis and the statistics of the lines, as data.' },
    },
    documents: {
      github: 'GitHub issue',
      slack: 'Slack message',
      pagerduty: 'PagerDuty event',
      postmortem: 'Post-mortem',
      json: 'JSON',
    },
    preview: 'Preview',
    previewTruncated: 'The preview shows the first part. Copy and Download use the whole text.',
    copy: 'Copy',
    copied: 'Copied',
    download: 'Download',
    needsAnalysisTitle: 'Analyze first',
    needsAnalysisText:
      'This format is built from the analysis report. Analyze the loaded log to unlock it.',
    needsLog: 'Load a log first.',
    analyzeNow: 'Analyze this log',
    analyzing: 'Analyzing',
    jsonStatisticsOnly: 'No analysis yet: the JSON holds only the statistics of the lines.',
    share: {
      title: 'Share link',
      intro:
        'Makes a link that holds the log and the report inside the address itself. Nothing is stored on a server.',
      notice: (replaced: number) => {
        if (replaced > 0) {
          return `${withCount(replaced, ['item', 'items'])} replaced. Detection may miss sensitive data; review the log and report before sharing. Anyone with the link can read them.`;
        }
        return 'No sensitive value was detected. Detection can miss data; review the log and report before sharing. Anyone with the link can read them.';
      },
      create: 'Create share link',
      creating: 'Creating',
      linkLabel: 'Share link',
      copyLink: 'Copy link',
      copiedLink: 'Copied',
      length: (characters: number) => `${characters.toLocaleString('en')} characters`,
      longWarning:
        'This link is long. Some chat apps and servers cut long addresses, so test it before you send it.',
      errors: {
        'too-large':
          'The log is too big for a link. Sanitize it and keep only the lines that matter.',
        corrupt: 'The share link could not be read: it looks cut or damaged.',
        invalid: 'The share link does not hold a LogLens log.',
        unsupported: 'Sharing links needs a newer browser.',
      },
    },
    restored: {
      withReport: 'Log and analysis restored from the share link.',
      logOnly: 'Log restored from the share link.',
      dismiss: 'Dismiss',
    },
    alert: {
      severity: {
        critical: 'CRITICAL',
        high: 'HIGH',
        medium: 'MEDIUM',
        low: 'LOW',
        informational: 'INFO',
      },
      impact: (faultLines: number, totalLines: number, category: string) =>
        `${withCount(faultLines, ['fault line', 'fault lines'])} in ${withCount(totalLines, ['line', 'lines'])}, category ${category}`,
      impactLabel: 'Impact',
      evidenceLabel: 'Top evidence',
      reportLabel: 'Report',
      linkPlaceholder: 'REPORT_LINK',
    },
    postmortem: {
      heading: 'Post-mortem',
      date: 'Date',
      severity: 'Severity',
      category: 'Category',
      summary: 'Summary',
      impact: 'Impact',
      impactText: (faultLines: number, totalLines: number, findings: number) =>
        `${withCount(faultLines, ['fault line', 'fault lines'])} among ${withCount(totalLines, ['line', 'lines'])}; ${withCount(findings, ['distinct finding', 'distinct findings'])}.`,
      timeline: 'Timeline',
      noTime: 'no time',
      roles: { root: 'root cause', effect: 'effect', independent: 'independent' },
      rootCause: 'Root cause',
      rootCauseUnknown: 'Not determined by the analysis. To be confirmed by the team.',
      resolution: 'Resolution and mitigation',
      resolutionUnknown: 'No steps were suggested. To be filled in by the team.',
      actionItems: 'Action items',
      defaultActions: [
        'Add an alert that would have caught this earlier',
        'Add a test that reproduces the failure',
        'Name an owner and a date for each item above',
      ],
      lessons: 'Lessons learned',
      lessonPrompts: [
        'What went well in detecting and fixing it?',
        'What was slow or unclear?',
        'What should change in the process or the system?',
      ],
    },
  },
  it: {
    title: 'Esporta',
    intro:
      'Trasforma l’analisi in ciò che usa il tuo team: una issue, un allarme, un post-mortem o dati.',
    formatsLabel: 'Formato di esportazione',
    formats: {
      github: { name: 'Issue GitHub', hint: 'Markdown, pronto da incollare in una nuova issue.' },
      alert: {
        name: 'Slack e PagerDuty',
        hint: 'Un messaggio Slack e un payload per PagerDuty Events API v2.',
      },
      postmortem: { name: 'Post-mortem', hint: 'Un report Markdown per chi legge i riepiloghi.' },
      json: { name: 'JSON', hint: 'L’analisi e le statistiche delle righe, come dati.' },
    },
    documents: {
      github: 'Issue GitHub',
      slack: 'Messaggio Slack',
      pagerduty: 'Evento PagerDuty',
      postmortem: 'Post-mortem',
      json: 'JSON',
    },
    preview: 'Anteprima',
    previewTruncated:
      'L’anteprima mostra solo la prima parte. Copia e Scarica usano il testo intero.',
    copy: 'Copia',
    copied: 'Copiato',
    download: 'Scarica',
    needsAnalysisTitle: 'Prima analizza',
    needsAnalysisText:
      'Questo formato nasce dal report dell’analisi. Analizza il log caricato per sbloccarlo.',
    needsLog: 'Prima carica un log.',
    analyzeNow: 'Analizza questo log',
    analyzing: 'Analisi in corso',
    jsonStatisticsOnly:
      'Nessuna analisi per ora: il JSON contiene solo le statistiche delle righe.',
    share: {
      title: 'Link di condivisione',
      intro:
        'Crea un link che contiene log e report dentro l’indirizzo stesso. Nulla viene salvato su un server.',
      notice: (replaced: number) => {
        if (replaced > 0) {
          return `${withCount(replaced, ['elemento sostituito', 'elementi sostituiti'])}. Il riconoscimento può non individuare tutti i dati sensibili: controlla log e report prima di condividere. Chi ha il link può leggerli.`;
        }
        return 'Nessun valore sensibile individuato. Il riconoscimento può non trovare tutto: controlla log e report prima di condividere. Chi ha il link può leggerli.';
      },
      create: 'Crea link di condivisione',
      creating: 'Creazione in corso',
      linkLabel: 'Link di condivisione',
      copyLink: 'Copia link',
      copiedLink: 'Copiato',
      length: (characters: number) => `${characters.toLocaleString('it')} caratteri`,
      longWarning:
        'Questo link è lungo. Alcune app di chat e alcuni server tagliano gli indirizzi lunghi: provalo prima di inviarlo.',
      errors: {
        'too-large':
          'Il log è troppo grande per un link. Oscuralo e tieni solo le righe che contano.',
        corrupt: 'Impossibile leggere il link di condivisione: sembra tagliato o danneggiato.',
        invalid: 'Il link di condivisione non contiene un log di LogLens.',
        unsupported: 'Per condividere con un link serve un browser più recente.',
      },
    },
    restored: {
      withReport: 'Log e analisi ripristinati dal link di condivisione.',
      logOnly: 'Log ripristinato dal link di condivisione.',
      dismiss: 'Chiudi',
    },
    alert: {
      severity: {
        critical: 'CRITICA',
        high: 'ALTA',
        medium: 'MEDIA',
        low: 'BASSA',
        informational: 'INFO',
      },
      impact: (faultLines: number, totalLines: number, category: string) =>
        `${withCount(faultLines, ['riga di errore', 'righe di errore'])} su ${withCount(totalLines, ['riga', 'righe'])}, categoria ${category}`,
      impactLabel: 'Impatto',
      evidenceLabel: 'Prova principale',
      reportLabel: 'Report',
      linkPlaceholder: 'LINK_AL_REPORT',
    },
    postmortem: {
      heading: 'Post-mortem',
      date: 'Data',
      severity: 'Gravità',
      category: 'Categoria',
      summary: 'Sintesi',
      impact: 'Impatto',
      impactText: (faultLines: number, totalLines: number, findings: number) =>
        `${withCount(faultLines, ['riga di errore', 'righe di errore'])} su ${withCount(totalLines, ['riga', 'righe'])}; ${withCount(findings, ['evento distinto', 'eventi distinti'])}.`,
      timeline: 'Cronologia',
      noTime: 'senza orario',
      roles: { root: 'causa radice', effect: 'effetto', independent: 'indipendente' },
      rootCause: 'Causa radice',
      rootCauseUnknown: 'Non stabilita dall’analisi. Da confermare con il team.',
      resolution: 'Risoluzione e mitigazione',
      resolutionUnknown: 'Nessun passo suggerito. Da compilare con il team.',
      actionItems: 'Azioni da fare',
      defaultActions: [
        'Aggiungere un allarme che l’avrebbe rilevato prima',
        'Aggiungere un test che riproduce il guasto',
        'Indicare un responsabile e una data per ogni punto sopra',
      ],
      lessons: 'Lezioni imparate',
      lessonPrompts: [
        'Cosa è andato bene nel rilevarlo e risolverlo?',
        'Cosa è stato lento o poco chiaro?',
        'Cosa va cambiato nel processo o nel sistema?',
      ],
    },
  },
});
