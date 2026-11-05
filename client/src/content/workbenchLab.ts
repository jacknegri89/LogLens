import { defineText } from '../i18n/defineText';
import { withCount } from '../i18n/plural';

const LINE_FORMS = ['line', 'lines'] as const;
const RIGHE_FORMS = ['riga', 'righe'] as const;
const MATCH_FORMS = ['match', 'matches'] as const;
const CORRISPONDENZE_FORMS = ['corrispondenza', 'corrispondenze'] as const;

/** Text of the Lab view: regex lab, log diff and source maps. */
export const LAB_TEXT = defineText({
  en: {
    tabsLabel: 'Lab tools',
    tabs: { regex: 'Regex Lab', diff: 'Log Diff', sourceMaps: 'Source Maps' },
    copy: 'Copy',
    copied: 'Copied',
    regex: {
      intro: 'Type a pattern and see it highlighted on the loaded log, live.',
      noLog: 'No log loaded. Load one above to search it.',
      patternLabel: 'Pattern',
      patternPlaceholder: String.raw`e.g. timeout after (\d+)ms`,
      flagsLabel: 'Flags',
      flags: {
        ignoreCase: 'i: ignore case',
        global: 'g: every match in a line',
        multiline: 'm: multiline',
        dotAll: 's: dot matches newline',
      },
      quickLabel: 'Quick extract',
      extractors: {
        ipv4: 'IPv4',
        uuid: 'UUID',
        secrets: 'JWT & secrets',
        stackFrames: 'Stack frames',
        latencies: 'Latencies',
      },
      invalid: (message: string) => `Invalid pattern: ${message}`,
      risky:
        'This pattern repeats a repeat, like (a+)+. On some lines it can freeze the page, so it was not run. Rewrite it with a fixed separator between the repeats.',
      scanFailed:
        'The search stopped because it took too long or could not start. Try a simpler pattern.',
      scanning: (scanned: number, total: number) => `Scanning ${scanned} of ${total} lines`,
      summary: (matches: number, lines: number) =>
        `${withCount(matches, MATCH_FORMS)} in ${withCount(lines, LINE_FORMS)}`,
      stoppedEarly: (limit: number) =>
        `Stopped early: the first ${limit} matches are shown and the rest of the log was not searched. Make the pattern more specific.`,
      noMatches: 'No line matches this pattern.',
      previewHeading: (shown: number, total: number) => {
        if (total > shown) {
          return `First ${shown} of ${total} matching lines`;
        }
        return `Matching lines (${shown})`;
      },
      previewLabel: 'Matching lines',
      lineNumber: (number: number) => `Line ${number}`,
      valuesHeading: 'Unique values',
      valuesLabel: 'Unique matched values with their counts',
      copyValues: 'Copy values',
      maskedNote: 'Secrets are shortened here and in the copied list.',
      latency: {
        heading: 'Latency summary',
        min: 'Min',
        average: 'Average',
        p95: 'p95',
        max: 'Max',
        unit: 'ms',
      },
    },
    diff: {
      intro:
        'Load a working log and a broken one. Messages are reduced to their shape, so ids, numbers and times do not count as differences.',
      baselineTitle: 'Baseline (working)',
      canaryTitle: 'Canary (broken)',
      pasteLabel: (title: string) => `${title}: paste log text`,
      pastePlaceholder: 'Paste log text here',
      openFile: 'Open file',
      fileLabel: (title: string) => `${title}: open a .log or .txt file`,
      useLoaded: 'Use the loaded log',
      noLoadedLog: 'No log is loaded in the Workbench.',
      clear: 'Clear',
      source: {
        paste: (lines: number) => `Pasted text, ${withCount(lines, LINE_FORMS)}`,
        file: (name: string, lines: number) => `${name}, ${withCount(lines, LINE_FORMS)}`,
        workbench: (lines: number) => `Loaded log, ${withCount(lines, LINE_FORMS)}`,
      },
      fileTooBig: (megabytes: number) => `This file is over ${megabytes} MB. Use a smaller one.`,
      fileUnreadable: 'The file could not be read.',
      compare: 'Compare',
      needBoth: 'Fill both logs to compare them.',
      noDifferences: 'No difference: both logs have the same message shapes at similar counts.',
      summaryHeading: 'Summary',
      summaryLabels: { lines: 'Lines', faults: 'Faults', signatures: 'Distinct signatures' },
      baselineShort: 'Baseline',
      canaryShort: 'Canary',
      newHeading: 'New in the canary',
      removedHeading: 'Gone from the canary',
      shiftedHeading: 'Count changed 3x or more',
      none: 'None.',
      moreHidden: (count: number) => `${count} more not listed.`,
      fault: 'Fault',
      counts: (baseline: number, canary: number) => `Baseline ${baseline}, canary ${canary}`,
      direction: { up: 'More frequent', down: 'Less frequent' },
      sample: 'Sample line',
      copyNew: 'Copy new signatures',
    },
    sourceMaps: {
      intro:
        'Paste or open a .js.map file, paste a minified stack trace, and get the original file, line and function. Everything stays in your browser.',
      mapHeading: 'Source map',
      mapPasteLabel: 'Paste the contents of a .js.map file',
      mapPlaceholder: 'Paste the .js.map JSON here',
      openMap: 'Open .js.map',
      loadMap: 'Load pasted map',
      mapLoaded: (name: string, sources: number) => {
        let label = 'sources';
        if (sources === 1) {
          label = 'source';
        }
        return `${name}: ${sources} ${label}`;
      },
      mapPasted: 'Pasted map',
      mapProblems: {
        invalidJson: 'This is not valid JSON. Paste the whole .js.map file.',
        notSourceMap: 'This JSON is not a source map.',
        unsupportedVersion: 'Only source map version 3 is supported.',
        missingSources: 'The map has no "sources" list.',
        missingMappings: 'The map has no "mappings" text.',
        badSection: 'A section of this index map is broken or points to a separate file.',
      },
      mapTooBig: (megabytes: number) => `This file is over ${megabytes} MB. Use a smaller one.`,
      mapUnreadable: 'The file could not be read.',
      traceHeading: 'Minified stack trace',
      traceLabel: 'Paste a minified stack trace',
      tracePlaceholder: 'at e (https://example.com/app.min.js:1:2034)',
      needMap: 'Load a source map to resolve the trace.',
      needTrace: 'Paste a stack trace to resolve it.',
      noFrames: 'No stack frames found. Chrome, Node, Firefox and Safari formats are supported.',
      resultHeading: (resolved: number, total: number) => {
        let label = 'frames';
        if (total === 1) {
          label = 'frame';
        }
        return `${resolved} of ${total} ${label} resolved`;
      },
      minified: 'Minified',
      original: 'Original',
      anonymous: 'anonymous function',
      snippetLabel: (file: string) => `Source around ${file}`,
      unresolved: {
        noPosition: 'This frame has no line and column.',
        invalidPosition: 'The line or column is not a valid position.',
        lineOutsideMap:
          'The line is beyond the end of this map. Is it the right map for this file?',
        noMappingAtColumn: 'The map has nothing for this column.',
        sourceMissing: 'The map points to a source it does not list.',
        brokenMappings: 'The mappings data of this map is damaged at this line.',
        mapTooLarge: 'This map exceeds the decoding limit. Try a smaller source map.',
      },
    },
  },
  it: {
    tabsLabel: 'Strumenti del laboratorio',
    tabs: { regex: 'Regex Lab', diff: 'Confronto log', sourceMaps: 'Source map' },
    copy: 'Copia',
    copied: 'Copiato',
    regex: {
      intro: 'Scrivi un pattern e vedilo evidenziato in tempo reale sul log caricato.',
      noLog: 'Nessun log caricato. Caricane uno qui sopra per cercarci dentro.',
      patternLabel: 'Pattern',
      patternPlaceholder: String.raw`es. timeout after (\d+)ms`,
      flagsLabel: 'Flag',
      flags: {
        ignoreCase: 'i: ignora maiuscole',
        global: 'g: ogni corrispondenza nella riga',
        multiline: 'm: multilinea',
        dotAll: 's: il punto include a capo',
      },
      quickLabel: 'Estrazione rapida',
      extractors: {
        ipv4: 'IPv4',
        uuid: 'UUID',
        secrets: 'JWT e segreti',
        stackFrames: 'Frame di stack',
        latencies: 'Latenze',
      },
      invalid: (message: string) => `Pattern non valido: ${message}`,
      risky:
        'Questo pattern ripete una ripetizione, come (a+)+. Su alcune righe può bloccare la pagina, quindi non è stato eseguito. Riscrivilo con un separatore fisso tra le ripetizioni.',
      scanFailed:
        'La ricerca è stata interrotta perché troppo lenta o non disponibile. Prova un pattern più semplice.',
      scanning: (scanned: number, total: number) => `Scansione di ${scanned} righe su ${total}`,
      summary: (matches: number, lines: number) =>
        `${withCount(matches, CORRISPONDENZE_FORMS)} in ${withCount(lines, RIGHE_FORMS)}`,
      stoppedEarly: (limit: number) =>
        `Interrotto in anticipo: vedi le prime ${limit} corrispondenze e il resto del log non è stato cercato. Rendi il pattern più preciso.`,
      noMatches: 'Nessuna riga corrisponde a questo pattern.',
      previewHeading: (shown: number, total: number) => {
        if (total > shown) {
          return `Prime ${shown} righe su ${total} corrispondenti`;
        }
        return `Righe corrispondenti (${shown})`;
      },
      previewLabel: 'Righe corrispondenti',
      lineNumber: (number: number) => `Riga ${number}`,
      valuesHeading: 'Valori unici',
      valuesLabel: 'Valori trovati, unici, con il numero di occorrenze',
      copyValues: 'Copia i valori',
      maskedNote: 'I segreti sono abbreviati qui e nell’elenco copiato.',
      latency: {
        heading: 'Riepilogo latenze',
        min: 'Min',
        average: 'Media',
        p95: 'p95',
        max: 'Max',
        unit: 'ms',
      },
    },
    diff: {
      intro:
        'Carica un log che funziona e uno rotto. I messaggi sono ridotti alla loro forma, quindi id, numeri e orari non contano come differenze.',
      baselineTitle: 'Baseline (funzionante)',
      canaryTitle: 'Canary (rotto)',
      pasteLabel: (title: string) => `${title}: incolla il testo del log`,
      pastePlaceholder: 'Incolla qui il testo del log',
      openFile: 'Apri file',
      fileLabel: (title: string) => `${title}: apri un file .log o .txt`,
      useLoaded: 'Usa il log caricato',
      noLoadedLog: 'Nessun log caricato nel Workbench.',
      clear: 'Svuota',
      source: {
        paste: (lines: number) => `Testo incollato, ${withCount(lines, RIGHE_FORMS)}`,
        file: (name: string, lines: number) => `${name}, ${withCount(lines, RIGHE_FORMS)}`,
        workbench: (lines: number) => `Log caricato, ${withCount(lines, RIGHE_FORMS)}`,
      },
      fileTooBig: (megabytes: number) => `Il file supera ${megabytes} MB. Usane uno più piccolo.`,
      fileUnreadable: 'Impossibile leggere il file.',
      compare: 'Confronta',
      needBoth: 'Riempi entrambi i log per confrontarli.',
      noDifferences: 'Nessuna differenza: i due log hanno gli stessi messaggi con conteggi simili.',
      summaryHeading: 'Riepilogo',
      summaryLabels: { lines: 'Righe', faults: 'Errori', signatures: 'Firme distinte' },
      baselineShort: 'Baseline',
      canaryShort: 'Canary',
      newHeading: 'Nuove nel canary',
      removedHeading: 'Sparite dal canary',
      shiftedHeading: 'Conteggio cambiato di 3 volte o più',
      none: 'Nessuna.',
      moreHidden: (count: number) => `Altre ${count} non elencate.`,
      fault: 'Errore',
      counts: (baseline: number, canary: number) => `Baseline ${baseline}, canary ${canary}`,
      direction: { up: 'Più frequente', down: 'Meno frequente' },
      sample: 'Riga di esempio',
      copyNew: 'Copia le nuove firme',
    },
    sourceMaps: {
      intro:
        'Incolla o apri un file .js.map, incolla uno stack trace minificato e ottieni file, riga e funzione originali. Tutto resta nel tuo browser.',
      mapHeading: 'Source map',
      mapPasteLabel: 'Incolla il contenuto di un file .js.map',
      mapPlaceholder: 'Incolla qui il JSON del .js.map',
      openMap: 'Apri .js.map',
      loadMap: 'Carica la map incollata',
      mapLoaded: (name: string, sources: number) => {
        let label = 'sorgenti';
        if (sources === 1) {
          label = 'sorgente';
        }
        return `${name}: ${sources} ${label}`;
      },
      mapPasted: 'Map incollata',
      mapProblems: {
        invalidJson: 'Non è un JSON valido. Incolla l’intero file .js.map.',
        notSourceMap: 'Questo JSON non è una source map.',
        unsupportedVersion: 'È supportata solo la versione 3 delle source map.',
        missingSources: 'Alla map manca l’elenco "sources".',
        missingMappings: 'Alla map manca il testo "mappings".',
        badSection: 'Una sezione di questa index map è rotta o rimanda a un file esterno.',
      },
      mapTooBig: (megabytes: number) => `Il file supera ${megabytes} MB. Usane uno più piccolo.`,
      mapUnreadable: 'Impossibile leggere il file.',
      traceHeading: 'Stack trace minificato',
      traceLabel: 'Incolla uno stack trace minificato',
      tracePlaceholder: 'at e (https://example.com/app.min.js:1:2034)',
      needMap: 'Carica una source map per risolvere il trace.',
      needTrace: 'Incolla uno stack trace per risolverlo.',
      noFrames:
        'Nessun frame trovato. Sono supportati i formati di Chrome, Node, Firefox e Safari.',
      resultHeading: (resolved: number, total: number) => `${resolved} frame su ${total} risolti`,
      minified: 'Minificato',
      original: 'Originale',
      anonymous: 'funzione anonima',
      snippetLabel: (file: string) => `Sorgente attorno a ${file}`,
      unresolved: {
        noPosition: 'Questo frame non ha riga e colonna.',
        invalidPosition: 'Riga o colonna non sono una posizione valida.',
        lineOutsideMap: 'La riga è oltre la fine di questa map. È la map giusta per questo file?',
        noMappingAtColumn: 'La map non ha nulla per questa colonna.',
        sourceMissing: 'La map rimanda a un sorgente che non elenca.',
        brokenMappings: 'I dati "mappings" di questa map sono danneggiati a questa riga.',
        mapTooLarge: 'Questa map supera il limite di lettura. Prova una source map più piccola.',
      },
    },
  },
});

/** Text of the live tail control that sits next to the Analyze button. */
export const LIVE_TAIL_TEXT = defineText({
  en: {
    start: 'Live tail',
    stop: 'Stop live tail',
    startHint: 'Simulate a log stream that escalates to a fatal error',
    running: (lines: number) => `Streaming, ${withCount(lines, LINE_FORMS)} added`,
    scenarios: {
      paymentTimeouts: 'Payment gateway timeouts',
      poolExhaustion: 'Database pool exhaustion',
      memoryLeak: 'Memory leak',
    },
    fatalIntercepted: (line: number) => `Fatal line intercepted at line ${line}`,
    analyzing: 'Analyzing the log and opening Insights.',
    limitReached: (limit: number) => `Live tail stopped after ${limit} lines.`,
    dismiss: 'Dismiss',
  },
  it: {
    start: 'Live tail',
    stop: 'Ferma live tail',
    startHint: 'Simula un flusso di log che degenera in un errore fatale',
    running: (lines: number) => `In diretta, ${withCount(lines, RIGHE_FORMS)} aggiunte`,
    scenarios: {
      paymentTimeouts: 'Timeout del gateway di pagamento',
      poolExhaustion: 'Pool del database esaurito',
      memoryLeak: 'Perdita di memoria',
    },
    fatalIntercepted: (line: number) => `Riga fatale intercettata alla riga ${line}`,
    analyzing: 'Analisi del log in corso, si apre Metriche.',
    limitReached: (limit: number) => `Live tail fermato dopo ${limit} righe.`,
    dismiss: 'Chiudi',
  },
});
