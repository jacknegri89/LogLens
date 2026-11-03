/**
 * Knowledge base of the correlation layer: which kinds of failure can cause which others,
 * and the sentences that tell the reader how the events of one log connect. The engine in
 * `ai/correlation.ts` only applies this table, so the wording and the relations can change
 * without touching the logic.
 *
 * A relation is encoded only when it is technically sound: the first event can really make
 * the later one happen. The engine also requires the cause to come BEFORE the effect.
 */

/** Which findings a side of a relation accepts: the rule category and, optionally, the evidence line. */
export interface EventMatcher {
  categories: string[];
  evidence?: RegExp;
}

export interface CausalRelation {
  id: string;
  causes: EventMatcher[];
  effects: EventMatcher[];
  /** Plain sentence that explains why the first event leads to the later ones. */
  explanation: string;
}

const VALUE_ERROR =
  /cannot read propert(?:y|ies)|undefined is not an object|is not a function|\bTypeError\b|nullpointerexception|\bKeyError\b|\bAttributeError\b|\bIndexError\b|nomethoderror|nullreferenceexception|unhandled ?promise ?rejection|uncaught/i;
const GATEWAY_ERROR =
  /bad gateway|service unavailable|gateway timeout|"\s50[234]\s|\bstatus[=:\s]+50[234]\b/i;
const TIMEOUT = /etimedout|timed out|timeout(?!_)|deadline exceeded/i;
const CONNECTION_DROPPED =
  /econnreset|socket hang up|connection reset by peer|econnrefused|connection refused/i;

/** Errors in code that reads a result which never arrived. */
const CODE_READING_MISSING_DATA: EventMatcher = { categories: ['Runtime'], evidence: VALUE_ERROR };
const SERVER_ERROR: EventMatcher = { categories: ['Server Error'] };
const GATEWAY: EventMatcher = { categories: ['Infrastructure'], evidence: GATEWAY_ERROR };
const TIMEOUT_WAITING: EventMatcher = { categories: ['Network'], evidence: TIMEOUT };

const DATABASE_CATEGORIES = ['Database', 'Database Connection Failure'];

export const CAUSAL_RELATIONS: CausalRelation[] = [
  {
    id: 'database-unavailable',
    causes: [
      {
        categories: DATABASE_CATEGORIES,
        evidence:
          /econnrefused|connection refused|can't reach database|authentication failed|access denied for user|too many connections|remaining connection slots|\bnoauth\b|\bwrongpass\b/i,
      },
    ],
    effects: [CODE_READING_MISSING_DATA, SERVER_ERROR, GATEWAY, TIMEOUT_WAITING],
    explanation:
      'A database that refuses or rejects connections breaks the code that reads its results; fix the database first and the later errors should disappear.',
  },
  {
    id: 'service-unreachable',
    causes: [
      {
        categories: ['Network'],
        evidence:
          /enotfound|getaddrinfo|could not resolve host|name or service not known|name resolution|ehostunreach|no route to host|enetunreach|network is unreachable|econnrefused|connection refused/i,
      },
    ],
    effects: [CODE_READING_MISSING_DATA, SERVER_ERROR, GATEWAY],
    explanation:
      'A service that cannot be reached makes the code that waits for its answer fail later; restore the connection first, then check the later errors again.',
  },
  {
    id: 'resource-exhausted',
    causes: [
      {
        categories: ['Infrastructure'],
        evidence:
          /out of memory|outofmemoryerror|oomkilled|heap out of memory|exit code 137|no space left on device|enospc|disk quota exceeded|too many open files|emfile|enfile/i,
      },
    ],
    effects: [
      {
        categories: ['Infrastructure'],
        evidence:
          /crashloopbackoff|back-off restarting|failed to start|main process exited|job for \S+ failed|bad gateway|service unavailable|gateway timeout|"\s50[234]\s/i,
      },
      { categories: ['Network'], evidence: CONNECTION_DROPPED },
      SERVER_ERROR,
      {
        categories: DATABASE_CATEGORIES,
        evidence: /misconf|database is locked|sqlite_busy|could not write|read-only/i,
      },
    ],
    explanation:
      'A full disk, missing memory or missing file handles make processes crash, restart or drop connections; free the resource first, then check the later errors again.',
  },
  {
    id: 'certificate-invalid',
    causes: [
      {
        categories: ['Network'],
        evidence: /certificate|self[- ]signed|ssl routines|unable_to_verify_leaf_signature|x509/i,
      },
    ],
    effects: [
      {
        categories: ['Network'],
        evidence:
          /econnreset|econnaborted|connection aborted|ssl handshake|handshake failure|socket hang up|connection reset by peer/i,
      },
      GATEWAY,
      SERVER_ERROR,
    ],
    explanation:
      'An invalid TLS certificate breaks the secure connections that depend on it; renew or fix the certificate first, then check the later errors again.',
  },
  {
    id: 'service-failed-to-run',
    causes: [
      {
        categories: ['Infrastructure'],
        evidence:
          /crashloopbackoff|back-off restarting|imagepullbackoff|errimagepull|failed to pull image|cannot connect to the docker daemon|docker daemon is not running|failed to start |main process exited|job for \S+ failed/i,
      },
    ],
    effects: [
      { categories: ['Network'], evidence: CONNECTION_DROPPED },
      {
        categories: ['Database'],
        evidence: /econnrefused|connection refused|can't reach database/i,
      },
      SERVER_ERROR,
      GATEWAY,
      TIMEOUT_WAITING,
    ],
    explanation:
      'A service that fails to start leaves everything that depends on it without an answer; start it first, then check the later errors again.',
  },
];

/** Categories of events that point at one actor: attacks, failed logins, refused requests. */
export const SUSPICIOUS_CATEGORIES = [
  'Security Attack',
  'Authentication',
  'Access Denied',
  'Client Error',
  'Rate Limit',
];

/** Failed logins from one address needed before an accepted login counts as a likely brute force. */
export const MIN_FAILED_LOGINS_BEFORE_SUCCESS = 3;

export const MAX_OVERVIEW_ITEMS = 6;
export const MAX_OVERVIEW_LENGTH = 400;

/** Sentences of the overview. Titles are cut short before they get here, so every item stays brief. */
export const OVERVIEW_TEXT = {
  rootCause: (cause: string, consequences: string, explanation: string): string =>
    `Probable root cause: ${cause}. ${explanation} Likely consequences: ${consequences}.`,
  orderWithTime: (events: string[]): string => `Order of events: ${events.join(', ')}.`,
  orderWithoutTime: (events: string[]): string =>
    `Order of events in the log: ${events.join(', then ')}.`,
  sameAttacker: (address: string, count: number, categories: string): string =>
    `The same address ${address} sent ${count} suspicious requests (${categories}): treat it as one attacker and block it once.`,
  sameHost: (address: string, count: number, categories: string): string =>
    `The same address ${address} appears in ${count} different events (${categories}): check that host first, it may be the common point.`,
  sameUser: (user: string, count: number, categories: string): string =>
    `The user name ${user} appears in ${count} different events (${categories}): check whether it is the same account.`,
  bruteForceSucceeded: (failedLogins: number, address: string, user: string): string =>
    `Possible successful brute force: ${failedLogins} failed login lines from ${address} were followed by an accepted login for ${user}. Treat the account ${user} as compromised: change its credentials, end its sessions and review what it did after the login.`,
  moreConsequences: (count: number): string => `and ${count} more`,
};
