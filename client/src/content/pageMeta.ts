import { defineText } from '../i18n/defineText';

/** The title and description of every page: they show in the browser tab and in search results. */
export const PAGE_META_TEXT = defineText({
  en: {
    home: {
      title: 'LogLens - AI log analysis',
      description:
        'Paste a log or stack trace and get the failing lines, severity, probable causes and a ready-to-paste GitHub issue.',
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
      description: 'A read-only copy of a LogLens report, shared with a secret link.',
    },
    notFound: {
      title: 'Page not found - LogLens',
      description: 'This page does not exist.',
    },
  },
  it: {
    home: {
      title: 'LogLens - analisi dei log con AI',
      description:
        'Incolla un log o uno stack trace e ottieni le righe che falliscono, la gravità, le cause probabili e una issue GitHub pronta da copiare.',
    },
    workbench: {
      title: 'Workbench - LogLens',
      description:
        'Cerca, raggruppa e ispeziona un log nel tuo browser: query, tracce, un laboratorio di regex, controlli di sicurezza ed esportazioni.',
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
      description: 'Una copia in sola lettura di un report LogLens, condivisa con un link segreto.',
    },
    notFound: {
      title: 'Pagina non trovata - LogLens',
      description: 'Questa pagina non esiste.',
    },
  },
});
