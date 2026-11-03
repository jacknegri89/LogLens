import { describe, expect, it } from 'vitest';

import { createAnalysisBodySchema } from './createAnalysis';

describe('createAnalysisBodySchema', () => {
  // ── Valid inputs ─────────────────────────────────────────────────────────

  it('accepts a body with only rawLog', () => {
    const result = createAnalysisBodySchema.safeParse({ rawLog: 'ERROR: something broke' });
    expect(result.success).toBe(true);
  });

  it('accepts paste as source', () => {
    const result = createAnalysisBodySchema.safeParse({ rawLog: 'log', source: 'paste' });
    expect(result.success).toBe(true);
  });

  it('accepts upload as source', () => {
    const result = createAnalysisBodySchema.safeParse({ rawLog: 'log', source: 'upload' });
    expect(result.success).toBe(true);
  });

  it('accepts optional fileName', () => {
    const result = createAnalysisBodySchema.safeParse({
      rawLog: 'log',
      source: 'upload',
      fileName: 'app.log',
    });
    expect(result.success).toBe(true);
  });

  it('accepts rawLog at exactly 200,000 characters', () => {
    const result = createAnalysisBodySchema.safeParse({ rawLog: 'x'.repeat(200_000) });
    expect(result.success).toBe(true);
  });

  it('accepts fileName at exactly 255 characters', () => {
    const result = createAnalysisBodySchema.safeParse({
      rawLog: 'log',
      fileName: 'a'.repeat(255),
    });
    expect(result.success).toBe(true);
  });

  // ── Invalid inputs ───────────────────────────────────────────────────────

  it('rejects missing rawLog', () => {
    const result = createAnalysisBodySchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects empty rawLog', () => {
    const result = createAnalysisBodySchema.safeParse({ rawLog: '' });
    expect(result.success).toBe(false);
  });

  it('rejects rawLog exceeding 200,000 characters', () => {
    const result = createAnalysisBodySchema.safeParse({ rawLog: 'x'.repeat(200_001) });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid source value', () => {
    const result = createAnalysisBodySchema.safeParse({ rawLog: 'log', source: 'clipboard' });
    expect(result.success).toBe(false);
  });

  it('rejects fileName longer than 255 characters', () => {
    const result = createAnalysisBodySchema.safeParse({
      rawLog: 'log',
      fileName: 'a'.repeat(256),
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-string rawLog', () => {
    const result = createAnalysisBodySchema.safeParse({ rawLog: 42 });
    expect(result.success).toBe(false);
  });

  it('rejects null rawLog', () => {
    const result = createAnalysisBodySchema.safeParse({ rawLog: null });
    expect(result.success).toBe(false);
  });
});
