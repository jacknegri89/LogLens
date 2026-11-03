import { describe, expect, it } from 'vitest';

import type { Language } from '../types/language';
import { CAUSAL_RELATIONS, OVERVIEW_TEXT } from './correlations';
import { OVERVIEW_TEXT_IT, RELATION_EXPLANATION_IT } from './correlations.it';
import { FORMAT_LABEL } from './formatLabels';
import { FORMAT_LABEL_IT } from './formatLabels.it';
import {
  formatLabel,
  overviewText,
  relationExplanation,
  reportText,
  ruleCauses,
  ruleText,
} from './localized';
import type { LogDetails } from './logDetails';
import { PROMPT_LANGUAGE } from './promptLanguage';
import { REPORT_TEXT } from './reportText';
import { REPORT_TEXT_IT } from './reportText.it';
import { FALLBACK_RULE, RULES } from './rules';
import { RULE_TEXT_IT } from './rules.it';

/** Adding a language to `Language` makes this object, and so this test file, stop compiling. */
const LANGUAGE_FLAGS: Record<Language, true> = { en: true, it: true };
const LANGUAGES = Object.keys(LANGUAGE_FLAGS) as Language[];
const ALL_RULES = [...RULES, FALLBACK_RULE];

const EMPTY_DETAILS: LogDetails = { failureLineFields: [] };
/** Every detail set to its own marker, so a text that ignores a detail can be spotted. */
const FULL_DETAILS: LogDetails = {
  postgresUser: 'MARK_PG_USER',
  mysqlUser: 'MARK_MYSQL_USER',
  typeErrorMessage: 'MARK_TYPE_MESSAGE',
  lastFrame: 'MARK_FRAME',
  nullColumn: 'MARK_COLUMN',
  missingObject: 'MARK_OBJECT',
  exceptionName: 'MARK_EXCEPTION',
  clientStatus: '404',
  failureLine: 'MARK_FAILURE_LINE',
  failureLineFields: [{ label: 'level', value: 'ERROR' }],
};
const MARKERS = ['MARK_', '404', 'ERROR'];
const FAILURE_WITHOUT_FIELDS: LogDetails = {
  failureLine: 'something broke',
  failureLineFields: [],
};
const DETAIL_SAMPLES = [EMPTY_DETAILS, FULL_DETAILS, FAILURE_WITHOUT_FIELDS];

describe('rule texts', () => {
  it('gives every rule a unique id', () => {
    const ids = ALL_RULES.map((rule) => rule.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has an Italian entry for every rule id, and none for an id that does not exist', () => {
    const ruleIds = ALL_RULES.map((rule) => rule.id).sort();

    expect(Object.keys(RULE_TEXT_IT).sort()).toEqual(ruleIds);
  });

  it.each(ALL_RULES.map((rule) => [rule.id, rule] as const))(
    'has the same number of causes and steps in every language for %s',
    (_id, rule) => {
      const english = ruleText(rule, 'en');
      for (const language of LANGUAGES) {
        const translated = ruleText(rule, language);

        expect(translated.debugSteps).toHaveLength(english.debugSteps.length);
        expect(Boolean(translated.causesFor)).toBe(Boolean(english.causesFor));
        for (const details of DETAIL_SAMPLES) {
          expect(ruleCauses(translated, details)).toHaveLength(ruleCauses(english, details).length);
        }
      }
    },
  );

  it.each(ALL_RULES.map((rule) => [rule.id, rule] as const))(
    'translates every sentence of %s instead of copying the English one',
    (_id, rule) => {
      const english = ruleText(rule, 'en');
      const italian = ruleText(rule, 'it');
      const englishSentences = [...ruleCauses(english, FULL_DETAILS), ...english.debugSteps];
      const italianSentences = [...ruleCauses(italian, FULL_DETAILS), ...italian.debugSteps];

      italianSentences.forEach((sentence, index) => {
        expect(sentence.trim()).not.toBe('');
        expect(sentence).not.toBe(englishSentences[index]);
      });
    },
  );

  it.each(ALL_RULES.filter((rule) => rule.causesFor).map((rule) => [rule.id, rule] as const))(
    'quotes the log details in the causes of %s in every language',
    (_id, rule) => {
      for (const language of LANGUAGES) {
        const causes = ruleCauses(ruleText(rule, language), FULL_DETAILS).join(' ');

        expect(MARKERS.some((marker) => causes.includes(marker))).toBe(true);
      }
    },
  );

  it('keeps categories, MITRE and OWASP names as written in the rule, whatever the language', () => {
    for (const rule of ALL_RULES) {
      expect(ruleText(rule, 'it')).not.toHaveProperty('category');
      expect(rule.category).toMatch(/^[A-Za-z ]+$/);
    }
  });
});

describe('correlation texts', () => {
  it('explains every relation of the table in Italian, and only those', () => {
    const ids = CAUSAL_RELATIONS.map((relation) => relation.id).sort();

    expect(Object.keys(RELATION_EXPLANATION_IT).sort()).toEqual(ids);
    for (const relation of CAUSAL_RELATIONS) {
      const italian = relationExplanation(relation, 'it');

      expect(italian).not.toBe(relationExplanation(relation, 'en'));
      expect(italian.trim()).not.toBe('');
    }
  });

  it('builds every overview sentence in every language from the same facts', () => {
    expect(Object.keys(OVERVIEW_TEXT_IT).sort()).toEqual(Object.keys(OVERVIEW_TEXT).sort());
    for (const language of LANGUAGES) {
      const text = overviewText(language);
      const sentences = [
        text.rootCause('CAUSE', 'CONSEQUENCES', 'EXPLANATION'),
        text.orderWithTime(['FIRST', 'SECOND']),
        text.orderWithoutTime(['FIRST', 'SECOND']),
        text.sameAttacker('ADDRESS', 3, 'CATEGORIES'),
        text.sameHost('ADDRESS', 3, 'CATEGORIES'),
        text.sameUser('USER', 3, 'CATEGORIES'),
        text.bruteForceSucceeded(4, 'ADDRESS', 'USER'),
      ];

      for (const fact of ['CAUSE', 'CONSEQUENCES', 'EXPLANATION'])
        expect(sentences[0]).toContain(fact);
      for (const sentence of sentences.slice(1, 3)) expect(sentence).toMatch(/FIRST.*SECOND/);
      expect(sentences[3]).toMatch(/ADDRESS.*3.*CATEGORIES/);
      expect(sentences[5]).toMatch(/USER.*3.*CATEGORIES/);
      expect(sentences[6]).toMatch(/4.*ADDRESS.*USER/);
      expect(text.moreConsequences(2)).toContain('2');
    }
  });

  it('writes the Italian sentences in Italian', () => {
    expect(OVERVIEW_TEXT_IT.orderWithTime(['A'])).toBe('Ordine degli eventi: A.');
    expect(OVERVIEW_TEXT_IT.orderWithoutTime(['A', 'B'])).toBe(
      'Ordine degli eventi nel log: A, poi B.',
    );
  });
});

describe('format labels', () => {
  it('has an Italian label for every format, with the same keys', () => {
    expect(Object.keys(FORMAT_LABEL_IT).sort()).toEqual(Object.keys(FORMAT_LABEL).sort());
    for (const key of Object.keys(FORMAT_LABEL) as (keyof typeof FORMAT_LABEL)[]) {
      expect(formatLabel(key, 'it').trim()).not.toBe('');
      expect(formatLabel(key, 'en')).toBe(FORMAT_LABEL[key]);
    }
  });

  it('translates the labels that are plain words', () => {
    expect(formatLabel('plainText', 'it')).toBe('Testo semplice');
    expect(formatLabel('plainText', 'it')).not.toBe(formatLabel('plainText', 'en'));
  });
});

describe('report texts', () => {
  it('has the same fields in every language, all filled', () => {
    expect(Object.keys(REPORT_TEXT_IT).sort()).toEqual(Object.keys(REPORT_TEXT).sort());
    for (const language of LANGUAGES) {
      const text = reportText(language);

      for (const value of Object.values(text)) {
        if (typeof value === 'string') expect(value.trim()).not.toBe('');
      }
      expect(text.requestTitle('GET', '/orders', '500')).toMatch(/GET \/orders .*500/);
    }
  });

  it('writes the Italian headings in Italian', () => {
    expect(REPORT_TEXT_IT.severity).toBe('Severità');
    expect(REPORT_TEXT_IT.requestTitle('GET', '/orders', '500')).toBe(
      'GET /orders ha risposto 500',
    );
    expect(REPORT_TEXT.requestTitle('GET', '/orders', '500')).toBe('GET /orders returned 500');
  });
});

describe('prompt languages', () => {
  it('names the language and gives the four report headings in every language', () => {
    for (const language of LANGUAGES) {
      const { name, sections } = PROMPT_LANGUAGE[language];

      expect(name.trim()).not.toBe('');
      expect(Object.values(sections)).toHaveLength(4);
      for (const heading of Object.values(sections)) expect(heading.trim()).not.toBe('');
    }
    expect(Object.keys(PROMPT_LANGUAGE.it.sections)).toEqual(
      Object.keys(PROMPT_LANGUAGE.en.sections),
    );
  });

  it('keeps the owner Italian headings exactly as written', () => {
    expect(PROMPT_LANGUAGE.it.sections.security).toBe('## 🚨 INCIDENTI DI SICUREZZA RILEVATI');
    expect(PROMPT_LANGUAGE.it.sections.nextSteps).toBe(
      '## 🚀 PROSSIMI PASSI (NEXT STEPS) CORRETTI',
    );
  });
});
