import { describe, expect, it } from 'vitest';

import { createAnalysisBodySchema } from './createAnalysis';

describe('createAnalysisBodySchema', () => {
  // ── Valid inputs ─────────────────────────────────────────────────────────

  it('accepts a body with only rawLog', () => {
    const r = createAnalysisBodySchema.safeParse({ rawLog: 'ERROR: something broke' });
    expect(r.success).toBe(true);
  });

  it('accepts paste as source', () => {
    const r = createAnalysisBodySchema.safeParse({ rawLog: 'log', source: 'paste' });
    expect(r.success).toBe(true);
  });

  it('accepts upload as source', () => {
    const r = createAnalysisBodySchema.safeParse({ rawLog: 'log', source: 'upload' });
    expect(r.success).toBe(true);
  });

  it('accepts optional fileName', () => {
    const r = createAnalysisBodySchema.safeParse({
      rawLog: 'log',
      source: 'upload',
      fileName: 'app.log',
    });
    expect(r.success).toBe(true);
  });

  it('accepts rawLog at exactly 200,000 characters', () => {
    const r = createAnalysisBodySchema.safeParse({ rawLog: 'x'.repeat(200_000) });
    expect(r.success).toBe(true);
  });

  it('accepts fileName at exactly 255 characters', () => {
    const r = createAnalysisBodySchema.safeParse({
      rawLog: 'log',
      fileName: 'a'.repeat(255),
    });
    expect(r.success).toBe(true);
  });

  // ── Invalid inputs ───────────────────────────────────────────────────────

  it('rejects missing rawLog', () => {
    const r = createAnalysisBodySchema.safeParse({});
    expect(r.success).toBe(false);
  });

  it('rejects empty rawLog', () => {
    const r = createAnalysisBodySchema.safeParse({ rawLog: '' });
    expect(r.success).toBe(false);
  });

  it('rejects rawLog exceeding 200,000 characters', () => {
    const r = createAnalysisBodySchema.safeParse({ rawLog: 'x'.repeat(200_001) });
    expect(r.success).toBe(false);
  });

  it('rejects an invalid source value', () => {
    const r = createAnalysisBodySchema.safeParse({ rawLog: 'log', source: 'clipboard' });
    expect(r.success).toBe(false);
  });

  it('rejects fileName longer than 255 characters', () => {
    const r = createAnalysisBodySchema.safeParse({
      rawLog: 'log',
      fileName: 'a'.repeat(256),
    });
    expect(r.success).toBe(false);
  });

  it('rejects non-string rawLog', () => {
    const r = createAnalysisBodySchema.safeParse({ rawLog: 42 });
    expect(r.success).toBe(false);
  });

  it('rejects null rawLog', () => {
    const r = createAnalysisBodySchema.safeParse({ rawLog: null });
    expect(r.success).toBe(false);
  });
});
