import { defineText } from '../i18n/defineText';
import type { UnitForms } from '../i18n/plural';
import type { PresetId } from '../workbench/explorer/presetLogs';

/** "12,400 lines" / "12.400 righe": the count in the page's number format, with its unit. */
function countOf(count: number, locale: string, [singular, plural]: UnitForms): string {
  let unit = plural;
  if (count === 1) {
    unit = singular;
  }
  return `${count.toLocaleString(locale)} ${unit}`;
}

type PresetTexts = Record<PresetId, { title: string; description: string }>;

/** Text of the Workbench log loader and of the Explorer view. */
export const WORKBENCH_EXPLORER_TEXT = defineText({
  en: {
    loader: {
      heading: 'Load a log',
      pasteLabel: 'Paste log text',
      pastePlaceholder: 'Paste a log here, or type and press Ctrl+Enter',
      loadPasted: 'Load text',
      pastedName: 'Pasted text',
      dropTitle: 'Drop a log or an archive',
      dropHint:
        '.log .txt .gz .zip .tar .tar.gz .tgz · decoded in your browser, nothing is uploaded',
      dropActive: 'Drop to load',
      chooseFile: 'Choose file',
      reading: 'Reading the file',
      parsing: 'Reading lines',
      presets: 'Presets',
      presetsLabel: 'Ready-made incident logs',
      clear: 'Clear',
      empty: 'No log loaded',
      lineCount: (count: number) => countOf(count, 'en-US', ['line', 'lines']),
      errors: {
        corrupt: 'This file looks damaged: the archive could not be read.',
        tooBig: 'This file is too big: the limit is 50 MB of text once decompressed.',
        tooManyEntries: 'This archive holds too many files: the limit is 500.',
        unsupported:
          'This file type is not supported. Use plain text, .gz, .zip, .tar, .tar.gz or .tgz.',
        noText: 'This archive holds no readable text files.',
        readFailed: 'The browser could not read this file. Try again.',
      },
    },
    presets: {
      prismaPool: {
        title: 'Node.js · Prisma pool exhausted',
        description: 'Slow exports hold every connection; P2024 timeouts turn into 500s.',
      },
      fastapiRedis: {
        title: 'FastAPI · Redis lock deadlock',
        description: 'Redis reloads, two workers wait on each other, uvicorn traceback.',
      },
      kubernetesOom: {
        title: 'Kubernetes · JVM OOMKilled',
        description: 'Heap fills, exit code 137, restarts end in CrashLoopBackOff.',
      },
      tokioPanic: {
        title: 'Rust · Tokio worker panic',
        description: 'An empty batch panics workers one by one until the pool fails.',
      },
      grpcCertificate: {
        title: 'Go gRPC · expired mTLS cert',
        description: 'The client certificate expires at midnight; every call fails the handshake.',
      },
      edgeRateLimit: {
        title: 'Next.js · Edge timeout and 429',
        description: 'Retries against a rate-limited upstream end in Edge timeouts.',
      },
    } satisfies PresetTexts,
    explorer: {
      searchLabel: 'Search the log',
      searchPlaceholder: 'level:ERROR service:pay* latency:>200 -healthcheck',
      clearSearch: 'Clear search',
      matchCount: (shown: number, total: number) => {
        if (shown === total) {
          return countOf(total, 'en-US', ['line', 'lines']);
        }
        return `${shown.toLocaleString('en-US')} of ${countOf(total, 'en-US', ['line', 'lines'])}`;
      },
      focusFaults: 'Focus faults',
      unreadHint: (parts: string) => `Searched as plain text: ${parts}`,
      syntaxHint:
        'field:value · latency:>200 · status:5* · -word · "a phrase" · A OR B. Fields: level, service, message and any key=value of the line.',
      timeLabel: 'Time',
      timeModes: { utc: 'UTC', local: 'Local', relative: 'Relative' },
      relativeHint: 'Gap from the previous line with a time',
      listLabel: 'Log lines',
      bookmarked: 'Bookmarked',
      parsing: 'Reading a long log in the background…',
      emptyTitle: 'Nothing on the desk yet',
      emptyBody:
        'Paste a log, drop a file or an archive above, or open Presets for a ready-made incident.',
      noMatchesTitle: 'No line matches',
      noMatchesBody: 'Loosen the search or turn off Focus faults.',
    },
  },
  it: {
    loader: {
      heading: 'Carica un log',
      pasteLabel: 'Incolla il testo del log',
      pastePlaceholder: 'Incolla qui un log, oppure scrivi e premi Ctrl+Invio',
      loadPasted: 'Carica testo',
      pastedName: 'Testo incollato',
      dropTitle: 'Trascina un log o un archivio',
      dropHint: '.log .txt .gz .zip .tar .tar.gz .tgz · letto nel browser, nessun caricamento',
      dropActive: 'Rilascia per caricare',
      chooseFile: 'Scegli file',
      reading: 'Lettura del file',
      parsing: 'Lettura delle righe',
      presets: 'Esempi',
      presetsLabel: 'Log di incidenti pronti',
      clear: 'Svuota',
      empty: 'Nessun log caricato',
      lineCount: (count: number) => countOf(count, 'it-IT', ['riga', 'righe']),
      errors: {
        corrupt: 'Il file sembra danneggiato: non è stato possibile leggere l’archivio.',
        tooBig: 'Il file è troppo grande: il limite è 50 MB di testo decompresso.',
        tooManyEntries: 'L’archivio contiene troppi file: il limite è 500.',
        unsupported:
          'Tipo di file non supportato. Usa testo semplice, .gz, .zip, .tar, .tar.gz o .tgz.',
        noText: 'L’archivio non contiene file di testo leggibili.',
        readFailed: 'Il browser non è riuscito a leggere il file. Riprova.',
      },
    },
    presets: {
      prismaPool: {
        title: 'Node.js · pool Prisma esaurito',
        description: 'Export lenti occupano tutte le connessioni; i timeout P2024 diventano 500.',
      },
      fastapiRedis: {
        title: 'FastAPI · deadlock sui lock Redis',
        description: 'Redis ricarica i dati, due worker si aspettano a vicenda, traceback uvicorn.',
      },
      kubernetesOom: {
        title: 'Kubernetes · JVM OOMKilled',
        description: 'L’heap si riempie, exit code 137, i riavvii finiscono in CrashLoopBackOff.',
      },
      tokioPanic: {
        title: 'Rust · panic di un worker Tokio',
        description: 'Un batch vuoto manda in panic i worker uno dopo l’altro.',
      },
      grpcCertificate: {
        title: 'Go gRPC · certificato mTLS scaduto',
        description:
          'Il certificato client scade a mezzanotte; ogni chiamata fallisce l’handshake.',
      },
      edgeRateLimit: {
        title: 'Next.js · timeout Edge e 429',
        description: 'I tentativi verso un servizio limitato finiscono in timeout Edge.',
      },
    } satisfies PresetTexts,
    explorer: {
      searchLabel: 'Cerca nel log',
      searchPlaceholder: 'level:ERROR service:pay* latency:>200 -healthcheck',
      clearSearch: 'Cancella la ricerca',
      matchCount: (shown: number, total: number) => {
        if (shown === total) {
          return countOf(total, 'it-IT', ['riga', 'righe']);
        }
        return `${shown.toLocaleString('it-IT')} di ${countOf(total, 'it-IT', ['riga', 'righe'])}`;
      },
      focusFaults: 'Solo guasti',
      unreadHint: (parts: string) => `Cercato come testo semplice: ${parts}`,
      syntaxHint:
        'campo:valore · latency:>200 · status:5* · -parola · "una frase" · A OR B. Campi: level, service, message e ogni chiave=valore della riga.',
      timeLabel: 'Ora',
      timeModes: { utc: 'UTC', local: 'Locale', relative: 'Relativa' },
      relativeHint: 'Distanza dalla riga precedente con un orario',
      listLabel: 'Righe del log',
      bookmarked: 'Nei segnalibri',
      parsing: 'Lettura di un log lungo in background…',
      emptyTitle: 'La scrivania è ancora vuota',
      emptyBody:
        'Incolla un log, trascina sopra un file o un archivio, oppure apri Esempi per un incidente pronto.',
      noMatchesTitle: 'Nessuna riga corrisponde',
      noMatchesBody: 'Allarga la ricerca o disattiva Solo guasti.',
    },
  },
});
