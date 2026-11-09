import { defineText } from '../i18n/defineText';

/** The title and description of every page: they show in the browser tab and in search results. */
export const PAGE_META_TEXT = defineText({
  en: {
    home: {
      title: 'LogLens - find the root cause in your logs',
      description:
        'Paste a log or stack trace. LogLens groups failures into incidents, links their causes and drafts the GitHub issue.',
    },
    workbench: {
      title: 'Workbench - LogLens',
      description:
        'Search, group and inspect a log in your browser: queries, traces, a regex lab, security checks and exports.',
    },
    history: {
      title: 'History - LogLens',
      description: 'The analyses you ran in the last 90 days, kept for you only.',
    },
    privacy: {
      title: 'Privacy and cookies - LogLens',
      description: 'Which data LogLens handles, why, where it goes and how long it stays.',
    },
    analysis: {
      title: 'Analysis report - LogLens',
      description: 'The report of one analysis: severity, key lines, causes and debug steps.',
    },
    shared: {
      title: 'Shared report - LogLens',
      description:
        'A read-only LogLens report: incidents, evidence and the probable root cause of a log, shared with a private link.',
    },
    notFound: {
      title: 'Page not found - LogLens',
      description: 'This page does not exist.',
    },
  },
  it: {
    home: {
      title: 'LogLens - trova la causa radice nei tuoi log',
      description:
        'Incolla un log o uno stack trace. LogLens raggruppa i guasti in incidenti, ne collega le cause e scrive la issue GitHub.',
    },
    workbench: {
      title: 'Workbench - LogLens',
      description:
        'Cerca, raggruppa e ispeziona un log nel browser: query, tracce, laboratorio di regex, controlli di sicurezza, esportazioni.',
    },
    history: {
      title: 'Cronologia - LogLens',
      description: 'Le analisi eseguite negli ultimi 90 giorni, visibili solo a te.',
    },
    privacy: {
      title: 'Privacy e cookie - LogLens',
      description: 'Quali dati tratta LogLens, perché, dove vanno e per quanto tempo restano.',
    },
    analysis: {
      title: 'Report di analisi - LogLens',
      description: 'Il report di una analisi: gravità, righe chiave, cause e passi per il debug.',
    },
    shared: {
      title: 'Report condiviso - LogLens',
      description:
        'Un report LogLens in sola lettura: incidenti, prove e probabile causa radice di un log, condiviso con un link privato.',
    },
    notFound: {
      title: 'Pagina non trovata - LogLens',
      description: 'Questa pagina non esiste.',
    },
  },
});
