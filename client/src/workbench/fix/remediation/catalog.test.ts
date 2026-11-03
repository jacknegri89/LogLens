import { describe, expect, it } from 'vitest';

import {
  availableLanguages,
  findScenario,
  REMEDIATION_CATALOG,
  resolveLanguage,
  sampleFor,
} from './catalog';
import { SCENARIO_IDS } from './types';

describe('remediation catalog', () => {
  it('has at least twelve scenarios, one per id, in the id order', () => {
    expect(REMEDIATION_CATALOG.length).toBeGreaterThanOrEqual(12);
    expect(REMEDIATION_CATALOG.map((scenario) => scenario.id)).toEqual([...SCENARIO_IDS]);
  });

  it.each(REMEDIATION_CATALOG.map((scenario) => [scenario.id, scenario] as const))(
    '%s has at least three languages with a real patch',
    (_id, scenario) => {
      const languages = availableLanguages(scenario);
      expect(languages.length).toBeGreaterThanOrEqual(3);
      for (const language of languages) {
        const { before, after } = sampleFor(scenario, language);
        expect(before.trim(), language).not.toBe('');
        expect(after.trim(), language).not.toBe('');
        expect(after, language).not.toBe(before);
      }
    },
  );

  it('keeps no object placeholder or backtick fence in any snippet', () => {
    for (const scenario of REMEDIATION_CATALOG) {
      for (const sample of Object.values(scenario.samples)) {
        expect(sample.before + sample.after).not.toMatch(/\[object|```/);
      }
    }
  });
});

describe('resolveLanguage', () => {
  const scenario = findScenario('sql-injection');

  it('keeps the preferred language when the scenario has it', () => {
    expect(resolveLanguage(scenario, 'ruby')).toBe('ruby');
  });

  it('falls back to the first available language when it does not', () => {
    expect(resolveLanguage(findScenario('brute-force-login'), 'ruby')).toBe('node');
  });

  it('uses the first available language when nothing is preferred', () => {
    expect(resolveLanguage(scenario, null)).toBe('node');
  });
});
