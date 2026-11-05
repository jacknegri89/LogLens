import { DATABASE_SCENARIOS } from './catalogDatabase';
import { NETWORK_SCENARIOS } from './catalogNetwork';
import { RUNTIME_SCENARIOS } from './catalogRuntime';
import { SECURITY_SCENARIOS } from './catalogSecurity';
import {
  CODE_LANGUAGE_IDS,
  SCENARIO_IDS,
  type CodeLanguageId,
  type CodeSample,
  type RemediationScenario,
  type ScenarioId,
} from './types';

const ALL_SCENARIOS: RemediationScenario[] = [
  ...DATABASE_SCENARIOS,
  ...RUNTIME_SCENARIOS,
  ...NETWORK_SCENARIOS,
  ...SECURITY_SCENARIOS,
];

/** Scenarios in the display order of SCENARIO_IDS. */
export const REMEDIATION_CATALOG: RemediationScenario[] = SCENARIO_IDS.map((id) => {
  const scenario = ALL_SCENARIOS.find((candidate) => candidate.id === id);
  if (!scenario) {
    throw new Error('Missing remediation scenario: ' + id);
  }
  return scenario;
});

export function findScenario(id: ScenarioId): RemediationScenario {
  return REMEDIATION_CATALOG.find((scenario) => scenario.id === id) ?? REMEDIATION_CATALOG[0];
}

/** The languages that have a sample for the scenario, in the display order of CODE_LANGUAGE_IDS. */
export function availableLanguages(scenario: RemediationScenario): CodeLanguageId[] {
  return CODE_LANGUAGE_IDS.filter((language) => scenario.samples[language]);
}

/** The preferred language when the scenario has it, otherwise the first one it has. */
export function resolveLanguage(
  scenario: RemediationScenario,
  preferred: CodeLanguageId | null,
): CodeLanguageId {
  const languages = availableLanguages(scenario);
  if (preferred && languages.includes(preferred)) {
    return preferred;
  }
  return languages[0];
}

export function sampleFor(scenario: RemediationScenario, language: CodeLanguageId): CodeSample {
  const sample = scenario.samples[resolveLanguage(scenario, language)];
  if (!sample) {
    throw new Error('Scenario without samples: ' + scenario.id);
  }
  return sample;
}
