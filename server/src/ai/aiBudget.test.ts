import { describe, expect, it } from 'vitest';

import { checkBudget, estimateCostUsd, estimateTokens, type AiLimits } from './aiBudget';

const limits: AiLimits = {
  maxContextChars: 24_000,
  maxContextEvents: 250,
  maxCallsPerAnalysis: 1,
  maxCostUsdPerAnalysis: 0.05,
  inputUsdPerMillionTokens: 0.15,
  outputUsdPerMillionTokens: 0.6,
  timeoutMs: 20_000,
};

describe('AI budget', () => {
  it('estimates tokens from characters', () => {
    expect(estimateTokens(4000)).toBe(1000);
  });

  it('prices the input and the largest possible output', () => {
    const cost = estimateCostUsd(1_000_000, limits);
    expect(cost).toBeCloseTo(0.15 + (3000 / 1_000_000) * 0.6, 6);
  });

  it('allows a normal call', () => {
    expect(checkBudget(20_000, 0, limits)).toMatchObject({ allowed: true, reason: null });
  });

  it('refuses when the calls are used up, the context is too large or the cost is too high', () => {
    expect(checkBudget(20_000, 1, limits).allowed).toBe(false);
    expect(checkBudget(500_000, 0, limits).reason).toContain('larger than the allowed size');
    const expensive = { ...limits, maxCostUsdPerAnalysis: 0.0001 };
    expect(checkBudget(20_000, 0, expensive).reason).toContain('cost');
  });
});
