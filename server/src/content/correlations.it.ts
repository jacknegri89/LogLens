/**
 * Italian text of the correlation layer: the explanation of each relation of `correlations.ts`
 * (keyed by relation id) and the sentences of the overview. The relations themselves, the
 * categories and the patterns stay in English in `correlations.ts`.
 */
import type { OverviewText, RelationId } from './correlations';

export const RELATION_EXPLANATION_IT: Record<RelationId, string> = {
  'database-unavailable':
    'Un database che rifiuta le connessioni o le respinge manda in errore il codice che ne legge i risultati: correggi prima il database e gli errori successivi dovrebbero sparire.',
  'service-unreachable':
    'Un servizio irraggiungibile fa fallire più avanti il codice che ne attende la risposta: ripristina prima la connessione, poi ricontrolla gli errori successivi.',
  'resource-exhausted':
    'Disco pieno, memoria esaurita o file handle finiti fanno andare in crash o riavviare i processi e cadere le connessioni: libera prima la risorsa, poi ricontrolla gli errori successivi.',
  'certificate-invalid':
    'Un certificato TLS non valido interrompe le connessioni sicure che ne dipendono: rinnova o correggi prima il certificato, poi ricontrolla gli errori successivi.',
  'service-failed-to-run':
    'Un servizio che non riesce ad avviarsi lascia senza risposta tutto ciò che ne dipende: avvialo prima, poi ricontrolla gli errori successivi.',
};

export const OVERVIEW_TEXT_IT: OverviewText = {
  rootCause: (cause, consequences, explanation) =>
    `Probabile causa radice: ${cause}. ${explanation} Conseguenze probabili: ${consequences}.`,
  orderWithTime: (events) => `Ordine degli eventi: ${events.join(', ')}.`,
  orderWithoutTime: (events) => `Ordine degli eventi nel log: ${events.join(', poi ')}.`,
  sameAttacker: (address, count, categories) =>
    `Lo stesso indirizzo ${address} ha inviato ${count} richieste sospette (${categories}): consideralo un solo attaccante e bloccalo una volta sola.`,
  sameHost: (address, count, categories) =>
    `Lo stesso indirizzo ${address} compare in ${count} eventi diversi (${categories}): controlla prima quell'host, potrebbe essere il punto in comune.`,
  sameUser: (user, count, categories) =>
    `Il nome utente ${user} compare in ${count} eventi diversi (${categories}): verifica se si tratta dello stesso account.`,
  bruteForceSucceeded: (failedLogins, address, user) =>
    `Possibile brute force riuscito: ${failedLogins} righe di login fallito da ${address} sono state seguite da un login accettato per ${user}. Considera l'account ${user} compromesso: cambia le sue credenziali, termina le sue sessioni e controlla cosa ha fatto dopo il login.`,
  moreConsequences: (count) => `e altre ${count}`,
};
