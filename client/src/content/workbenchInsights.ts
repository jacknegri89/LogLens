import { defineText } from '../i18n/defineText';
import { withCount } from '../i18n/plural';
import type { RiskFactorId, RiskLevel } from '../workbench/insights/risk';
import type { TopologyKind, TopologyRole } from '../workbench/insights/topology';

/** Text of the Insights view: risk, repair time, cause ranking, blast radius and latency flamegraph. */
export const INSIGHTS_TEXT = defineText({
  en: {
    noLog: 'Load a log first: the insights are drawn from it.',
    sections: {
      metrics: 'Key metrics',
      causes: 'Root cause analysis',
      blast: 'Blast radius',
      latency: 'Latency flamegraph',
    },
    analyze: {
      title: 'Analyze to unlock the full picture',
      body: 'Risk score, repair time, cause ranking and blast radius come from the analysis. The latency flamegraph below only needs the log.',
      button: 'Analyze this log',
      loading: 'Analyzing',
    },
    severityTitle: 'Severity',
    risk: {
      title: 'Anomaly risk score',
      outOf: 'out of 100',
      levels: {
        low: 'Low',
        moderate: 'Moderate',
        high: 'High',
        severe: 'Severe',
      } satisfies Record<RiskLevel, string>,
      meterLabel: (score: number, level: string) => `Anomaly risk ${score} out of 100, ${level}`,
      how: 'How it is computed',
      howIntro:
        'A fixed formula, not a model: every factor adds points, the total stops at 100. The same log always gets the same score.',
      factorLabels: {
        severity: 'Severity of the incident',
        faultRatio: 'Share of failing lines',
        findings: 'Distinct problems found',
        rootCause: 'A root cause that spread',
        security: 'Security finding',
        burst: 'Burst of errors',
      } satisfies Record<RiskFactorId, string>,
      factorDetails: {
        severity: (severity: string) => `The analysis rated it ${severity.toLowerCase()}`,
        faultRatio: (percent: number) => `${percent}% of the lines are errors or stack frames`,
        findings: (count: number) =>
          `${withCount(count, ['finding', 'findings'])}, 1 point each up to 5`,
        rootCause: (effects: number) => {
          if (effects > 0) {
            return `One failure set off ${withCount(effects, ['other event', 'other events'])}`;
          }
          return 'No failure set off another one';
        },
        security: (count: number) => {
          if (count > 0) {
            return withCount(count, ['security finding', 'security findings']);
          }
          return 'None found';
        },
        burst: (count: number) => {
          if (count > 0) {
            return `${withCount(count, ['burst', 'bursts'])} of 5 or more errors within 10 seconds`;
          }
          return 'No 5 errors within 10 seconds';
        },
      },
      points: (points: number, maxPoints: number) => `${points} of ${maxPoints}`,
      total: 'Total',
      capped: (raw: number) => `${raw} before the cap at 100`,
    },
    mttr: {
      title: 'Time to restore',
      estimate: 'Estimate',
      range: (min: number, max: number) => `${min}-${max} min`,
      basis: (category: string, severity: string) =>
        `Typical for ${category}, ${severity.toLowerCase()}`,
      note: 'A rule of thumb for this kind of incident, not a promise. Your team, tooling and on-call can move it a lot.',
    },
    causes: {
      lead: 'In plain words',
      heuristic: 'Heuristic confidence',
      heuristicHint:
        'A readable estimate from the order of the report and the evidence, not a statistical model. The top cause never goes above 95%.',
      empty: 'The report lists no probable causes for this log.',
      listLabel: 'Probable causes ranked by heuristic confidence',
      percent: (value: number) => `${value}%`,
      barLabel: (rank: number, value: number) => `Cause ${rank}: ${value}% heuristic confidence`,
      other: 'Something not in this list',
      how: 'How the confidence is computed',
      howSteps: [
        'Position: the report already lists the likeliest cause first, so the list position gives 40, 32, 24, 16 and then 8 points.',
        'Evidence: words of the cause that also appear in the evidence lines add points (more for codes, numbers and long identifiers), up to 24.',
        'Root cause: 20 points when the cause names the same specific thing as the root event of the timeline.',
        'Confirmation: 5 points for each finding the cause also names, up to 15, when at least two do.',
        'The points of all causes are scaled to add up to 100%.',
      ],
      columns: {
        cause: 'Cause',
        position: 'Position',
        evidence: 'Evidence',
        rootCause: 'Root event',
        confirmation: 'Findings',
        points: 'Points',
      },
      rowLabel: (position: number) => `Cause ${position}`,
    },
    blast: {
      intro:
        'Where the incident started and how far it reached, read from the service names, keywords and the cause-and-effect timeline.',
      chartLabel: 'Map of the system with the origin of the incident and the parts it reached',
      kinds: {
        loadBalancer: 'Load balancer',
        api: 'API',
        service: 'Service',
        database: 'Database',
        cache: 'Cache',
        queue: 'Queue',
        external: 'External',
      } satisfies Record<TopologyKind, string>,
      roles: {
        origin: 'Origin',
        affected: 'Affected',
        healthy: 'Healthy',
        unknown: 'In the log',
      } satisfies Record<TopologyRole, string>,
      origin: (names: string) => `Origin: ${names}`,
      affected: (names: string) => `affected: ${names}`,
      nothingAffected: 'affected: nothing else',
      listLabel: 'Parts of the system',
      listItem: (name: string, role: string) => `${name}: ${role.toLowerCase()}`,
      sparse:
        'Not enough information to draw the whole chain: only the parts found in the log are shown.',
      empty: 'No part of the system could be recognised in this log.',
      noDiagnosis: 'Analyze the log to see where the incident started and what it reached.',
      legendLabel: 'Legend',
      legendFlow: 'Red moving line: the way the failure travelled',
    },
    flame: {
      intro:
        'Width is time spent. Each block is a service, then the operation inside it. Click a block to zoom in, Esc to go back.',
      empty:
        'No latency found in this log. Lines like "took 120ms" or latency_ms=120 feed this chart.',
      chartLabel: 'Flamegraph of the latency by service and operation',
      reset: 'Reset zoom',
      zoomed: (label: string) => `Zoomed on ${label}`,
      allRequests: 'All requests',
      unknownService: 'unknown',
      otherOperations: (count: number) =>
        `${withCount(count, ['other operation', 'other operations'])}`,
      tooltip: {
        total: 'Total',
        count: 'Calls',
        max: 'Slowest',
        share: 'Share',
      },
      summaryLabel: (count: number) =>
        `Latency of ${withCount(count, ['measured line', 'measured lines'])}`,
      percentiles: { p50: 'p50', p95: 'p95', p99: 'p99', max: 'max' },
      tableCaption: 'Latency by service and operation',
      tableColumns: {
        name: 'Service / operation',
        total: 'Total',
        count: 'Calls',
        max: 'Slowest',
        share: 'Share',
      },
      sharePercent: (share: number) => `${(share * 100).toFixed(1)}%`,
    },
  },
  it: {
    noLog: 'Prima carica un log: le metriche vengono ricavate da lì.',
    sections: {
      metrics: 'Metriche chiave',
      causes: 'Analisi della causa radice',
      blast: 'Raggio del danno',
      latency: 'Flamegraph della latenza',
    },
    analyze: {
      title: 'Analizza per vedere il quadro completo',
      body: "Punteggio di rischio, tempo di ripristino, classifica delle cause e raggio del danno vengono dall'analisi. Il flamegraph della latenza qui sotto richiede solo il log.",
      button: 'Analizza questo log',
      loading: 'Analisi in corso',
    },
    severityTitle: 'Gravità',
    risk: {
      title: 'Rischio anomalia',
      outOf: 'su 100',
      levels: {
        low: 'Basso',
        moderate: 'Moderato',
        high: 'Alto',
        severe: 'Grave',
      } satisfies Record<RiskLevel, string>,
      meterLabel: (score: number, level: string) => `Rischio anomalia ${score} su 100, ${level}`,
      how: 'Come viene calcolato',
      howIntro:
        'Una formula fissa, non un modello: ogni fattore aggiunge punti e il totale si ferma a 100. Lo stesso log dà sempre lo stesso punteggio.',
      factorLabels: {
        severity: "Gravità dell'incidente",
        faultRatio: 'Quota di righe in errore',
        findings: 'Problemi distinti trovati',
        rootCause: 'Una causa radice che si è propagata',
        security: 'Segnalazione di sicurezza',
        burst: 'Raffica di errori',
      } satisfies Record<RiskFactorId, string>,
      factorDetails: {
        severity: (severity: string) => `L'analisi lo ha valutato ${severity.toLowerCase()}`,
        faultRatio: (percent: number) => `${percent}% delle righe sono errori o frame di stack`,
        findings: (count: number) =>
          `${withCount(count, ['problema', 'problemi'])}, 1 punto ciascuno fino a 5`,
        rootCause: (effects: number) => {
          if (effects > 0) {
            return `Un guasto ne ha innescati altri ${effects}`;
          }
          return 'Nessun guasto ne ha innescato un altro';
        },
        security: (count: number) => {
          if (count > 0) {
            return withCount(count, ['segnalazione di sicurezza', 'segnalazioni di sicurezza']);
          }
          return 'Nessuna trovata';
        },
        burst: (count: number) => {
          if (count > 0) {
            return `${withCount(count, ['raffica', 'raffiche'])} di 5 o più errori in 10 secondi`;
          }
          return 'Nessun gruppo di 5 errori in 10 secondi';
        },
      },
      points: (points: number, maxPoints: number) => `${points} su ${maxPoints}`,
      total: 'Totale',
      capped: (raw: number) => `${raw} prima del limite di 100`,
    },
    mttr: {
      title: 'Tempo di ripristino',
      estimate: 'Stima',
      range: (min: number, max: number) => `${min}-${max} min`,
      basis: (category: string, severity: string) =>
        `Tipico per ${category}, ${severity.toLowerCase()}`,
      note: 'Una regola empirica per questo tipo di incidente, non una promessa. Il tuo team, gli strumenti e la reperibilità possono cambiarla molto.',
    },
    causes: {
      lead: 'In parole semplici',
      heuristic: 'Confidenza euristica',
      heuristicHint:
        "Una stima leggibile, ricavata dall'ordine del rapporto e dalle prove, non un modello statistico. La causa in testa non supera mai il 95%.",
      empty: 'Il rapporto non elenca cause probabili per questo log.',
      listLabel: 'Cause probabili in ordine di confidenza euristica',
      percent: (value: number) => `${value}%`,
      barLabel: (rank: number, value: number) => `Causa ${rank}: confidenza euristica ${value}%`,
      other: 'Qualcosa che non è in questa lista',
      how: 'Come viene calcolata la confidenza',
      howSteps: [
        'Posizione: il rapporto mette già per prima la causa più probabile, quindi la posizione nella lista dà 40, 32, 24, 16 e poi 8 punti.',
        'Prove: le parole della causa che compaiono anche nelle righe di prova aggiungono punti (di più per codici, numeri e identificatori lunghi), fino a 24.',
        "Causa radice: 20 punti se la causa nomina la stessa cosa specifica dell'evento radice della cronologia.",
        'Conferme: 5 punti per ogni problema che la causa nomina a sua volta, fino a 15, se almeno due coincidono.',
        'I punti di tutte le cause vengono riportati in scala fino a sommare 100%.',
      ],
      columns: {
        cause: 'Causa',
        position: 'Posizione',
        evidence: 'Prove',
        rootCause: 'Evento radice',
        confirmation: 'Problemi',
        points: 'Punti',
      },
      rowLabel: (position: number) => `Causa ${position}`,
    },
    blast: {
      intro:
        "Dove è partito l'incidente e fin dove è arrivato, letto da nomi dei servizi, parole chiave e cronologia causa-effetto.",
      chartLabel: "Mappa del sistema con l'origine dell'incidente e le parti raggiunte",
      kinds: {
        loadBalancer: 'Load balancer',
        api: 'API',
        service: 'Servizio',
        database: 'Database',
        cache: 'Cache',
        queue: 'Coda',
        external: 'Esterno',
      } satisfies Record<TopologyKind, string>,
      roles: {
        origin: 'Origine',
        affected: 'Colpito',
        healthy: 'Sano',
        unknown: 'Nel log',
      } satisfies Record<TopologyRole, string>,
      origin: (names: string) => `Origine: ${names}`,
      affected: (names: string) => `colpiti: ${names}`,
      nothingAffected: 'colpiti: nient’altro',
      listLabel: 'Parti del sistema',
      listItem: (name: string, role: string) => `${name}: ${role.toLowerCase()}`,
      sparse:
        'Informazioni insufficienti per disegnare tutta la catena: si vedono solo le parti trovate nel log.',
      empty: 'Nel log non è stata riconosciuta nessuna parte del sistema.',
      noDiagnosis: "Analizza il log per vedere dove è partito l'incidente e cosa ha raggiunto.",
      legendLabel: 'Legenda',
      legendFlow: 'Linea rossa in movimento: il percorso del guasto',
    },
    flame: {
      intro:
        "La larghezza è il tempo impiegato. Ogni blocco è un servizio, poi l'operazione al suo interno. Clicca un blocco per ingrandirlo, Esc per tornare indietro.",
      empty:
        'Nel log non c\'è nessuna latenza. Righe come "took 120ms" o latency_ms=120 alimentano questo grafico.',
      chartLabel: 'Flamegraph della latenza per servizio e operazione',
      reset: 'Azzera zoom',
      zoomed: (label: string) => `Zoom su ${label}`,
      allRequests: 'Tutte le richieste',
      unknownService: 'sconosciuto',
      otherOperations: (count: number) =>
        `${withCount(count, ['altra operazione', 'altre operazioni'])}`,
      tooltip: {
        total: 'Totale',
        count: 'Chiamate',
        max: 'Più lenta',
        share: 'Quota',
      },
      summaryLabel: (count: number) =>
        `Latenza di ${withCount(count, ['riga misurata', 'righe misurate'])}`,
      percentiles: { p50: 'p50', p95: 'p95', p99: 'p99', max: 'max' },
      tableCaption: 'Latenza per servizio e operazione',
      tableColumns: {
        name: 'Servizio / operazione',
        total: 'Totale',
        count: 'Chiamate',
        max: 'Più lenta',
        share: 'Quota',
      },
      sharePercent: (share: number) => `${(share * 100).toFixed(1)}%`,
    },
  },
});
