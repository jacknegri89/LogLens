import { describe, expect, it } from 'vitest';

import { raiseSeverity } from './ruleMatching';

describe('raiseSeverity', () => {
  it('raises a lower severity to the floor', () => {
    expect(raiseSeverity('high', 'critical')).toBe('critical');
    expect(raiseSeverity('informational', 'medium')).toBe('medium');
  });

  it('never lowers a severity that is already at or above the floor', () => {
    expect(raiseSeverity('critical', 'high')).toBe('critical');
    expect(raiseSeverity('high', 'high')).toBe('high');
  });
});
