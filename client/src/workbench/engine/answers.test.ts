import { describe, expect, it } from 'vitest';

import { ASK_TEXT } from '../../content/workbenchAsk';
import { REPORT_TEXT } from '../../content/report';
import { LANGUAGES } from '../../i18n/languages';
import type { AnalysisRecord } from '../../lib/types';
import { buildBuiltInAnswer, type AnswerContext } from './answers';
import { INTENT_IDS } from './intents';

function contextFor(language: (typeof LANGUAGES)[number]): AnswerContext {
  return { text: ASK_TEXT[language].answers, severityLabels: REPORT_TEXT[language].severityLabels };
}

const INCIDENT = {
  id: 'incident',
  title: 'connect ECONNREFUSED 10.0.2.15:5432',
  severity: 'high',
  category: 'Database',
  rawLog: 'INFO boot\nERROR connect ECONNREFUSED 10.0.2.15:5432\nERROR pool exhausted',
  report: {
    keyLines: ['ERROR connect ECONNREFUSED 10.0.2.15:5432'],
    causes: ['The database is not listening.', 'The host or port in DATABASE_URL is wrong.'],
    debugSteps: ['Check that postgres is running.', 'Compare DATABASE_URL with the real host.'],
    overview: ['One root cause and two effects.'],
    findings: [
      { title: 'Database unreachable', severity: 'high', category: 'Database', evidence: 'e' },
      { title: 'Pool exhausted', severity: 'medium', category: 'Database', evidence: 'e' },
    ],
    timeline: [
      {
        time: '10:00:01',
        title: 'Database unreachable',
        role: 'root',
        severity: 'high',
        category: 'Database',
        evidence: 'e',
      },
      {
        time: '10:00:03',
        title: 'Pool exhausted',
        role: 'effect',
        severity: 'medium',
        category: 'Database',
        evidence: 'e',
        causedBy: 0,
      },
    ],
  },
} as unknown as AnalysisRecord;

const ATTACK = {
  id: 'attack',
  title: 'GET /products?id=1 OR 1=1 returned 500',
  severity: 'critical',
  category: 'Security Attack',
  rawLog: 'GET /products?id=1%27%20OR%201%3D1--',
  report: {
    keyLines: ['GET /products?id=1%27%20OR%201%3D1--'],
    causes: ['A scanner sent injection payloads.'],
    debugSteps: ['Block the source IP.'],
    findings: [
      {
        title: 'SQL injection attempt',
        severity: 'critical',
        category: 'Security Attack',
        evidence: 'e',
        technique: 'T1190',
        owasp: 'A03:2021',
      },
    ],
  },
} as unknown as AnalysisRecord;

const EMPTY = {
  id: 'empty',
  title: 'Nothing found',
  severity: 'informational',
  category: 'Normal Traffic',
  rawLog: 'INFO ok',
  report: { keyLines: [], causes: [], debugSteps: [] },
} as unknown as AnalysisRecord;

describe.each(LANGUAGES)('built-in answers in %s', (language) => {
  const context = contextFor(language);
  const answer = (intent: (typeof INTENT_IDS)[number] | null, record = INCIDENT) =>
    buildBuiltInAnswer(intent, record, context);

  it('names the root cause and the first event of the chain', () => {
    const text = answer('rootCause');
    expect(text).toContain('The database is not listening.');
    expect(text).toContain('DATABASE_URL is wrong');
    expect(text).toContain('Database unreachable');
    expect(text).toContain('10:00:01');
  });

  it('starts with the first debug step and lists the next ones', () => {
    const text = answer('firstStep');
    expect(text.indexOf('Check that postgres is running.')).toBeLessThan(
      text.indexOf('Compare DATABASE_URL with the real host.'),
    );
  });

  it('says it is not an attack, without claiming more than it knows', () => {
    const text = answer('isAttack');
    expect(text).toContain('Database');
    expect(text).not.toContain('T1190');
  });

  it('says it is an attack and cites the technique and the OWASP category', () => {
    const text = answer('isAttack', ATTACK);
    expect(text).toContain('SQL injection attempt');
    expect(text).toContain('T1190');
    expect(text).toContain('A03:2021');
    expect(text).toContain(REPORT_TEXT[language].severityLabels.critical);
  });

  it('gives the first failing line with its number in the log', () => {
    const text = answer('firstFailure');
    expect(text).toContain('ERROR connect ECONNREFUSED 10.0.2.15:5432');
    expect(text).toContain('2');
  });

  it('reports severity, event count, overview and effects', () => {
    const text = answer('impact');
    expect(text).toContain(REPORT_TEXT[language].severityLabels.high);
    expect(text).toContain('2');
    expect(text).toContain('One root cause and two effects.');
    expect(text).toContain('Pool exhausted');
  });

  it('prevents by the causes and the steps of the report', () => {
    const text = answer('prevent');
    expect(text).toContain('The database is not listening.');
    expect(text).toContain('Check that postgres is running.');
  });

  it('explains in plain words with the title, a cause and a step', () => {
    const text = answer('explainSimply');
    expect(text).toContain('connect ECONNREFUSED 10.0.2.15:5432');
    expect(text).toContain('The database is not listening.');
    expect(text).toContain('Check that postgres is running.');
  });

  it('lists the events in order with their time and role', () => {
    const text = answer('timeline');
    expect(text.indexOf('Database unreachable')).toBeLessThan(text.indexOf('Pool exhausted'));
    expect(text).toContain('10:00:03');
    expect(text).toContain(ASK_TEXT[language].answers.timeline.roles.effect);
  });

  it('lists what it can answer when the question is not understood', () => {
    const text = answer(null);
    expect(text).toContain(ASK_TEXT[language].answers.fallback.lead);
    for (const topic of ASK_TEXT[language].answers.fallback.topics) {
      expect(text).toContain(topic);
    }
  });

  it('never leaves a template placeholder in an answer', () => {
    for (const intent of [...INTENT_IDS, null]) {
      for (const record of [INCIDENT, ATTACK, EMPTY]) {
        expect(answer(intent, record), `${intent} ${record.id}`).not.toMatch(/\{\w+\}/);
      }
    }
  });
});

describe('built-in answers for an analysis with little data', () => {
  const context = contextFor('en');

  it('says so instead of inventing a cause, a step or a failing line', () => {
    expect(buildBuiltInAnswer('rootCause', EMPTY, context)).toBe(context.text.rootCause.none);
    expect(buildBuiltInAnswer('firstStep', EMPTY, context)).toBe(context.text.firstStep.none);
    expect(buildBuiltInAnswer('firstFailure', EMPTY, context)).toBe(context.text.firstFailure.none);
    expect(buildBuiltInAnswer('prevent', EMPTY, context)).toBe(context.text.prevent.none);
  });

  it('says there is no sequence when the analysis has no timeline', () => {
    expect(buildBuiltInAnswer('timeline', EMPTY, context)).toBe(context.text.timeline.single);
  });

  it('finds no line number when the key line is not in the log', () => {
    const other = { ...INCIDENT, rawLog: 'something else' } as AnalysisRecord;
    expect(buildBuiltInAnswer('firstFailure', other, context)).not.toContain('(line');
  });

  it('keeps a markup-looking title as plain text', () => {
    const hostile = { ...EMPTY, title: '<img src=x onerror=alert(1)>' } as AnalysisRecord;
    expect(buildBuiltInAnswer('explainSimply', hostile, context)).toContain(
      '<img src=x onerror=alert(1)>',
    );
  });
});
