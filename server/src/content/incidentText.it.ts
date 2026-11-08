import type { RootCauseStatus } from '../types/report';
import type { CauseKind, IncidentText } from './incidentText';

const STATUS_LABEL_IT: Record<RootCauseStatus, string> = {
  confirmed: 'Confermata',
  probable: 'Probabile',
  unverified: 'Ipotesi non verificata',
  insufficient: 'Informazioni insufficienti',
};

function subjectOf(kind: CauseKind, subject: string): string {
  switch (kind) {
    case 'change':
      return `la modifica "${subject}"`;
    case 'dependency':
      return `il guasto di una dipendenza: "${subject}"`;
    case 'exception':
      return `un'eccezione nel codice: ${subject}`;
    case 'security':
      return `un tentativo di attacco: "${subject}"`;
    default:
      return 'sconosciuta';
  }
}

export const INCIDENT_TEXT_IT: IncidentText = {
  statusLabel: STATUS_LABEL_IT,
  rootCause: (status, kind, subject) => {
    if (status === 'insufficient' || kind === 'unknown') {
      return 'Il log mostra il guasto ma non ciò che lo ha causato.';
    }
    return `Causa ${STATUS_LABEL_IT[status].toLowerCase()}: ${subjectOf(kind, subject)}.`;
  },
  description: (failures, services, entities) => {
    let text = `${failures} eventi in errore in ${services.join(', ') || 'questo log'}`;
    if (entities > 0) {
      text += `, che toccano ${entities} ordini o utenti`;
    }
    return `${text}.`;
  },
  reasoning: (kind, explained, total, confirmedLinks) => {
    let subject = 'causa candidata';
    if (kind === 'change') {
      subject = 'modifica';
    }
    return `La ${subject} precede ${explained} dei ${total} guasti dell'incidente, e ${confirmedLinks} dei legami con essi sono confermati dal log stesso.`;
  },
  observedFailures: (count, services) => `${count} eventi in errore in ${services.join(', ')}.`,
  observedEntities: (count, list) => `${count} ordini o utenti coinvolti: ${list}.`,
  observedPaidThenFailed: (count, list) =>
    `${count} ordini hanno avuto il pagamento confermato e poi sono falliti: ${list}.`,
  observedUnavailable:
    'Qualcosa è diventato non disponibile: errori del server o connessioni rifiutate.',
  observedAttempt: 'È stato visto un tentativo di attacco. Il log non mostra che sia riuscito.',
  potentialCompromise: "Se il tentativo fosse riuscito, l'attaccante avrebbe raggiunto il sistema.",
  potentialContinues: 'I guasti continuano finché la causa non viene corretta.',
  potentialInconsistency:
    'Altri dati possono restare incoerenti finché la causa non viene corretta.',
  criterionExplained: (explained, total) =>
    `La causa spiega ${explained} dei ${total} guasti dell'incidente.`,
  criterionConfirmedLinks: (count) => `${count} legami con i guasti sono confermati dal log.`,
  criterionNoContradiction: 'Nessun evento del log contraddice la causa.',
  criterionContradiction: (count) => `${count} eventi o fatti vanno contro la causa.`,
  criterionTimeUncertain: "L'orario di alcuni eventi non è nel log: il loro ordine è dedotto.",
  criterionNoCause: 'Nessun legame o eccezione collega i guasti a una causa.',
  criterionTimeGrouped:
    'Alcuni guasti sono raggruppati solo perché sono avvenuti a pochi secondi di distanza nello stesso posto: il log non li collega.',
  contradictionEarlier: (line) =>
    `Lo stesso tipo di guasto compare già alla riga ${line}, prima di questo evento.`,
  dangerousCaution:
    'Attenzione: questo comando è distruttivo o difficile da annullare. Controlla il bersaglio e fai prima un backup.',
  unverifiedCausePrefix: 'Ipotesi non verificata (il log non la dimostra):',
  removedUnsupportedLine: '(riga rimossa: citava un valore che non è nel log)',
  neutralTitle: 'Analisi del log',
  actions: {
    change: {
      immediate: [
        'Confronta il valore modificato con quello precedente e controlla se i guasti sono iniziati subito dopo la modifica.',
        'Se la modifica è la causa, fai il rollback o ripristina il valore precedente, poi verifica se i guasti si fermano.',
      ],
      permanent: [
        'Correggi il valore o il codice che ne dipende e rilascialo con il normale processo di release.',
      ],
      preventive: [
        'Valida i valori di configurazione (intervalli, unità di misura) prima di applicarli.',
        'Distribuisci le modifiche di configurazione in modo graduale e imposta un allarme sui guasti che seguono una modifica.',
      ],
    },
    dependency: {
      immediate: [
        'Controlla lo stato della dipendenza che fallisce e ripristinala per prima: gli errori successivi dipendono da lei.',
        'Ricontrolla gli errori successivi quando funziona di nuovo.',
      ],
      permanent: [
        'Aggiungi un nuovo tentativo con attesa crescente e un timeout chiaro dove avviene la chiamata che fallisce.',
      ],
      preventive: [
        'Monitora la dipendenza e imposta un allarme prima che il suo guasto raggiunga i servizi che la chiamano.',
      ],
    },
    exception: {
      immediate: [
        "Apri il file e la riga del primo frame dello stack e trova quale valore o stato ha causato l'eccezione.",
      ],
      permanent: [
        "Correggi il codice in quel punto e aggiungi un test che riproduce l'input che fallisce.",
      ],
      preventive: [
        'Registra le eccezioni non gestite insieme al contesto della richiesta, per trovare la prossima più in fretta.',
      ],
    },
    security: {
      immediate: [
        'Blocca o limita le richieste della sorgente e cerca la stessa sorgente su altri percorsi nei log di accesso.',
        "Verifica che l'applicazione abbia respinto il payload; non dare per scontata una compromissione senza un segnale che la indichi.",
      ],
      permanent: ['Valida e codifica gli input che il payload prendeva di mira.'],
      preventive: [
        'Metti un WAF o un limite di richieste davanti agli endpoint pubblici e imposta un allarme sulle firme degli scanner.',
      ],
    },
    unknown: {
      immediate: [
        'Raccogli più log attorno ai guasti: gli eventi prima del primo e i log degli altri servizi coinvolti.',
      ],
      permanent: [],
      preventive: [
        "Registra gli identificatori (request id, order id) in ogni servizio per poter seguire i guasti tra uno e l'altro.",
      ],
    },
  },
  markdown: {
    incidents: '## Incidenti',
    rootCause: 'Causa radice',
    evidence: 'Prove',
    impact: 'Impatto',
    observed: 'Osservato',
    potential: 'Potenziale, non osservato',
    timeline: 'Cronologia',
    immediate: 'Azioni immediate',
    permanent: 'Correzione definitiva',
    preventive: 'Misure preventive',
    severity: 'Severità',
    line: 'riga',
    partial: (events, limit) =>
      `> **Analisi parziale.** ${events} eventi non sono stati analizzati (${limit}). Le conclusioni seguenti valgono solo per ciò che è stato analizzato.`,
    engine: (used, aiUsed, fallbackReason) => {
      if (fallbackReason !== null) {
        return `> Motore: ${used} (nessuna AI usata: ${fallbackReason}).`;
      }
      if (aiUsed) {
        return `> Motore: ${used} (assistito da AI, verificato sul log).`;
      }
      return `> Motore: ${used} (nessuna AI usata).`;
    },
  },
  limit: {
    'records-not-acquired': 'record che non è stato possibile leggere',
    'cut-by-budget': 'eventi tagliati dal limite di dimensione',
    'identifier-cap': 'eventi tagliati da un identificatore molto frequente',
    'change-cap': 'modifiche oltre il limite',
  },
};
