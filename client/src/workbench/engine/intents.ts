/** In tie-break order: when two intents score the same, the first one listed wins. */
export const INTENT_IDS = [
  'isAttack',
  'firstFailure',
  'prevent',
  'impact',
  'timeline',
  'explainSimply',
  'firstStep',
  'rootCause',
] as const;

export type IntentId = (typeof INTENT_IDS)[number];

interface Signal {
  pattern: RegExp;
  /** 2 for a phrase that names the intent, 1 for a word that only hints at it. */
  weight: number;
}

const strong = (pattern: RegExp): Signal => ({ pattern, weight: 2 });
const weak = (pattern: RegExp): Signal => ({ pattern, weight: 1 });

/** Matched against the question in lower case, without accents or punctuation. English and Italian. */
const SIGNALS: Record<IntentId, Signal[]> = {
  rootCause: [
    strong(/\broot cause\b/),
    strong(/\bwhy\b/),
    strong(/\bwhat (happened|went wrong|is wrong|broke|caused)\b/),
    strong(/\bperche\b/),
    strong(/\b(causa|cause|origine|motivo|colpa)\b/),
    strong(/\bcosa (e successo|e andato storto|non va|ha causato|ha provocato)\b/),
    weak(/\bcaus/),
  ],
  firstStep: [
    strong(/\bfirst (thing|step|action)\b/),
    strong(/\b(next|first) step\b/),
    strong(/\bwhat (should|do|can) i do\b/),
    strong(/\bwhere (do|should) i (start|begin)\b/),
    strong(/\bhow (do i|can i|to) (fix|solve|resolve|repair)\b/),
    strong(/\b(fix|solve|resolve|solution)\b/),
    strong(/\bprima cosa\b/),
    strong(/\bcosa (devo|dovrei|posso) fare\b/),
    strong(/\bda dove (parto|comincio|inizio)\b/),
    strong(/\bcome (risolvo|correggo|sistemo|ripar)/),
    strong(/\b(soluzione|risolvere|correggere)\b/),
    weak(/\bfare\b|\bdo\b/),
  ],
  isAttack: [
    strong(/\battack/),
    strong(/\battacc/),
    strong(/\b(malicious|malevol|hack|breach|intrusion|intrus|exploit)/),
    strong(/\b(brute force|injection|scanner)\b/),
    strong(/\bsecurity (issue|threat|incident)\b/),
    strong(/\b(sospett|incidente di sicurezza|minaccia)/),
    weak(/\bsecur|\bsicurezza\b/),
  ],
  firstFailure: [
    strong(/\bfirst (line|error|failure|failed|fail)\b/),
    strong(/\bwhich line\b/),
    strong(/\bfail(ed)? first\b/),
    strong(/\bwhere did it (start|begin)\b/),
    strong(/\bprima riga\b/),
    strong(/\bquale riga\b/),
    strong(/\bprimo (errore|fallimento)\b/),
    strong(/\b(e )?fallito per primo\b|\bha fallito prima\b/),
    strong(/\bda dove (e )?(iniziato|partito)\b/),
  ],
  impact: [
    strong(/\b(impact|blast radius)\b/),
    strong(/\baffect/),
    strong(/\bhow (bad|serious|severe|big)\b/),
    strong(/\b(severity|severe)\b/),
    strong(/\bimpatto\b/),
    strong(/\b(gravita|grave|gravi)\b/),
    strong(/\b(coinvolt|colpit|conseguenz|dann[io])/),
    weak(/\bcritical|\bcritic/),
  ],
  prevent: [
    strong(/\bprevent/),
    strong(/\bavoid\b/),
    strong(/\bhappen again\b/),
    strong(/\b(harden|mitigat)/),
    strong(/\bprevenir|\bprevenzione\b/),
    strong(/\bevitare\b/),
    strong(/\bnon (succeda|capiti|si ripeta) (piu|di nuovo)\b|\bsi ripeta\b/),
    weak(/\bfuture\b|\bin futuro\b/),
  ],
  explainSimply: [
    strong(/\b(simple|simply|plain words|plain english|eli5)\b/),
    strong(/\bexplain\b/),
    strong(/\bnon[ -]technical\b/),
    strong(/\b(semplic|spieg|riassum|riassunto)/),
    strong(/\bin (parole povere|breve)\b/),
    strong(/\b(summary|summarize|summarise|tl dr|tldr)\b/),
  ],
  timeline: [
    strong(/\b(timeline|sequence)\b|\bchronolog/),
    strong(/\bin order\b/),
    strong(/\border of (the )?events\b/),
    strong(/\bwhat changed\b/),
    strong(/\b(sequenza|in ordine|in che ordine|ordine degli eventi)\b|\bcronolog/),
    strong(/\bcosa e (cambiato|successo prima)\b/),
    weak(/\bevents?\b|\beventi\b/),
  ],
};

const MIN_SCORE = 2;

export function normalizeQuestion(question: string): string {
  return question
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function scoreIntent(intent: IntentId, text: string): number {
  return SIGNALS[intent].reduce(
    (sum, { pattern, weight }) => {
      if (pattern.test(text)) {
        return sum + weight;
      }
      return sum;
    },
    0,
  );
}

/** The intent a question most likely has, or null when nothing in it is recognisable. */
export function routeIntent(question: string): IntentId | null {
  const text = normalizeQuestion(question);
  let best: IntentId | null = null;
  let bestScore = MIN_SCORE - 1;
  for (const intent of INTENT_IDS) {
    const score = scoreIntent(intent, text);
    if (score > bestScore) {
      best = intent;
      bestScore = score;
    }
  }
  return best;
}
