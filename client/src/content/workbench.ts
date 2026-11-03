import { defineText } from '../i18n/defineText';

/** Text of the Workbench shell: the page header, the analyze button and the tab names. */
export const WORKBENCH_TEXT = defineText({
  en: {
    title: 'Workbench',
    intro:
      'Load a log, search it, group it, follow one request, then analyze it. Everything below works on the log you loaded; nothing leaves your browser until you press Analyze.',
    analyze: 'Analyze this log',
    analyzing: 'Analyzing',
    noLog: 'Load a log first.',
    tabsLabel: 'Workbench views',
    tabs: {
      explorer: 'Explorer',
      clusters: 'Clusters',
      traces: 'Traces',
      lab: 'Lab',
      security: 'Security',
      insights: 'Insights',
      fix: 'Fix',
      ask: 'Ask',
      export: 'Export',
    },
  },
  it: {
    title: 'Workbench',
    intro:
      'Carica un log, cercalo, raggruppalo, segui una singola richiesta, poi analizzalo. Tutto qui sotto lavora sul log caricato; niente lascia il tuo browser finché non premi Analizza.',
    analyze: 'Analizza questo log',
    analyzing: 'Analisi in corso',
    noLog: 'Prima carica un log.',
    tabsLabel: 'Viste del Workbench',
    tabs: {
      explorer: 'Esplora',
      clusters: 'Gruppi',
      traces: 'Tracce',
      lab: 'Laboratorio',
      security: 'Sicurezza',
      insights: 'Metriche',
      fix: 'Correzione',
      ask: 'Chiedi',
      export: 'Esporta',
    },
  },
});
