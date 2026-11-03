import { describe, expect, it } from 'vitest';

import { SCENARIO_IDS } from '../remediation/types';
import { regressionTestFor } from './catalog';
import { TEST_FRAMEWORK_IDS } from './types';

const PAIRS = SCENARIO_IDS.flatMap((scenario) =>
  TEST_FRAMEWORK_IDS.map((framework) => [scenario, framework] as const),
);

describe('regression test catalog', () => {
  it.each(PAIRS)('%s has a real test for %s', (scenario, framework) => {
    const code = regressionTestFor(scenario, framework);
    expect(code.trim().length).toBeGreaterThan(80);
    expect(code).toMatch(/assert|expect|verify/);
  });

  it.each(PAIRS)('%s in %s covers a valid and a failing case', (scenario, framework) => {
    const code = regressionTestFor(scenario, framework);
    const testCount = (code.match(/\bit(?:\.each)?\(|def test_|@Test|@ParameterizedTest/g) ?? [])
      .length;
    expect(testCount).toBeGreaterThanOrEqual(2);
  });

  it.each(PAIRS)('%s in %s keeps no template leftover', (scenario, framework) => {
    expect(regressionTestFor(scenario, framework)).not.toMatch(/\$\{|\[object/);
  });
});
