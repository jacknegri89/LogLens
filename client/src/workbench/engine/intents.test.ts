import { describe, expect, it } from 'vitest';

import { INTENT_IDS, normalizeQuestion, routeIntent, type IntentId } from './intents';

const QUESTIONS: [string, IntentId][] = [
  ['What is the root cause?', 'rootCause'],
  ['Why did this happen?', 'rootCause'],
  ['Perché è successo?', 'rootCause'],
  ['Qual è la causa del problema?', 'rootCause'],
  ['What should I do first?', 'firstStep'],
  ['How do I fix it?', 'firstStep'],
  ['Cosa devo fare per prima cosa?', 'firstStep'],
  ['Come posso risolvere?', 'firstStep'],
  ['Is this an attack?', 'isAttack'],
  ['Could this be malicious?', 'isAttack'],
  ['È un attacco?', 'isAttack'],
  ['Ci sono segnali di intrusione?', 'isAttack'],
  ['Which line failed first?', 'firstFailure'],
  ['What was the first error?', 'firstFailure'],
  ['Qual è la prima riga che ha fallito?', 'firstFailure'],
  ['Qual è stato il primo errore?', 'firstFailure'],
  ['What is the impact?', 'impact'],
  ['How bad is it?', 'impact'],
  ["Qual è l'impatto?", 'impact'],
  ['Quanto è grave?', 'impact'],
  ['How can I prevent this?', 'prevent'],
  ['How do I avoid it in the future?', 'prevent'],
  ['Come posso evitare che succeda ancora?', 'prevent'],
  ['Explain it in simple words', 'explainSimply'],
  ['Explain it to a non-technical person', 'explainSimply'],
  ['Spiegamelo in modo semplice', 'explainSimply'],
  ['Give me a summary', 'explainSimply'],
  ['Show me the timeline', 'timeline'],
  ['What changed, in order?', 'timeline'],
  ['In che ordine sono successi gli eventi?', 'timeline'],
  ['Mostrami la cronologia', 'timeline'],
];

describe('routeIntent', () => {
  it.each(QUESTIONS)('routes %j to %s', (question, expected) => {
    expect(routeIntent(question)).toBe(expected);
  });

  it('prefers the more specific intent when a question mixes two', () => {
    expect(routeIntent('Why is this an attack?')).toBe('isAttack');
  });

  it.each([
    '',
    '   ',
    'asdkjh qwe zxc',
    '???',
    'what is the weather today',
    'hello',
    '12345',
    'ciao come stai',
  ])('finds no intent in %j', (question) => {
    expect(routeIntent(question)).toBeNull();
  });

  it('ignores case, accents and punctuation', () => {
    expect(routeIntent('PERCHÉ!!! è successo???')).toBe('rootCause');
  });

  it('covers every intent with at least one sample question', () => {
    const covered = new Set(QUESTIONS.map(([, intent]) => intent));
    expect([...covered].sort()).toEqual([...INTENT_IDS].sort());
  });
});

describe('normalizeQuestion', () => {
  it('lowers case, removes accents and punctuation and trims', () => {
    expect(normalizeQuestion('  Perché, è... Successo?! ')).toBe('perche e successo');
  });
});
