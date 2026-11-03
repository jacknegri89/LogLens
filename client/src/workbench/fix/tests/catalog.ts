import type { ScenarioId } from '../remediation/types';
import { JEST_TESTS } from './catalogJest';
import { JUNIT_TESTS } from './catalogJunit';
import { PYTEST_TESTS } from './catalogPytest';
import type { TestFrameworkId } from './types';

const TESTS_BY_FRAMEWORK: Record<TestFrameworkId, Record<ScenarioId, string>> = {
  jest: JEST_TESTS,
  pytest: PYTEST_TESTS,
  junit5: JUNIT_TESTS,
};

/** The regression test of a scenario in the chosen framework. */
export function regressionTestFor(scenario: ScenarioId, framework: TestFrameworkId): string {
  return TESTS_BY_FRAMEWORK[framework][scenario];
}
