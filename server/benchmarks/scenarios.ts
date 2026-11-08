import {
  databaseWithConsequences,
  http409Conflict,
  independentIncidents,
  configDownstream,
} from './fixtures/correlationScenarios';
import {
  healthyLog,
  insufficientData,
  multilineStack,
  singleNodeError,
} from './fixtures/basicScenarios';
import {
  differentTimezones,
  mixedJsonAndNginx,
  outOfOrder,
  partiallyMalformed,
} from './fixtures/formatScenarios';
import { hiddenPromptInjection, noisyLog } from './fixtures/securityAndNoise';
import { ttlRegression } from './fixtures/ttlRegression';
import type { Scenario } from './scenarioTypes';

/**
 * Every benchmark scenario. The first fourteen are the cases the task lists; the TTL regression is
 * the mandatory complex one. Add a scenario here and it is evaluated everywhere.
 */
export const SCENARIOS: Scenario[] = [
  singleNodeError,
  databaseWithConsequences,
  multilineStack,
  mixedJsonAndNginx,
  outOfOrder,
  differentTimezones,
  independentIncidents,
  healthyLog,
  hiddenPromptInjection,
  configDownstream,
  http409Conflict,
  noisyLog,
  partiallyMalformed,
  insufficientData,
  ttlRegression,
];
