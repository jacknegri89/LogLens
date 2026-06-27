import { describe, expect, it } from 'vitest';

import { AppError } from '../middleware/errorHandler';
import { parseReport } from './parseReport';

const VALID_REPORT = {
  title: 'Database connection refused',
  severity: 'high',
  category: 'Database',
  keyLines: ['ERROR: Connection refused: localhost:5432'],
  causes: ['PostgreSQL not running'],
  debugSteps: ['Start PostgreSQL service'],
  bugReportMarkdown: '## Bug\n\nDatabase is down.',
};

describe('parseReport', () => {
  // ── Happy path ───────────────────────────────────────────────────────────

  it('parses a valid JSON string', () => {
    const r = parseReport(JSON.stringify(VALID_REPORT));
    expect(r.title).toBe('Database connection refused');
    expect(r.severity).toBe('high');
    expect(r.category).toBe('Database');
  });

  it('strips ```json code fences before parsing', () => {
    const fenced = '```json\n' + JSON.stringify(VALID_REPORT) + '\n```';
    const r = parseReport(fenced);
    expect(r.title).toBe(VALID_REPORT.title);
  });

  it('strips plain ``` code fences before parsing', () => {
    const fenced = '```\n' + JSON.stringify(VALID_REPORT) + '\n```';
    const r = parseReport(fenced);
    expect(r.title).toBe(VALID_REPORT.title);
  });

  it('trims surrounding whitespace before parsing', () => {
    const r = parseReport('  \n' + JSON.stringify(VALID_REPORT) + '\n  ');
    expect(r.title).toBe(VALID_REPORT.title);
  });

  it('defaults keyLines to [] when omitted', () => {
    const { keyLines: _kl, ...without } = VALID_REPORT;
    const r = parseReport(JSON.stringify(without));
    expect(r.keyLines).toEqual([]);
  });

  it('defaults causes to [] when omitted', () => {
    const { causes: _c, ...without } = VALID_REPORT;
    const r = parseReport(JSON.stringify(without));
    expect(r.causes).toEqual([]);
  });

  it('defaults debugSteps to [] when omitted', () => {
    const { debugSteps: _ds, ...without } = VALID_REPORT;
    const r = parseReport(JSON.stringify(without));
    expect(r.debugSteps).toEqual([]);
  });

  // ── Error cases ──────────────────────────────────────────────────────────

  it('throws AppError 502 for invalid JSON', () => {
    expect(() => parseReport('not json')).toThrowError(AppError);
  });

  it('sets statusCode 502 for invalid JSON', () => {
    try {
      parseReport('not json');
    } catch (err) {
      expect((err as AppError).statusCode).toBe(502);
    }
  });

  it('throws AppError 502 when JSON does not match schema', () => {
    expect(() => parseReport(JSON.stringify({ wrong: 'shape' }))).toThrowError(AppError);
  });

  it('throws AppError 502 when severity is not a valid enum value', () => {
    const bad = { ...VALID_REPORT, severity: 'critical' };
    expect(() => parseReport(JSON.stringify(bad))).toThrowError(AppError);
  });

  it('throws AppError 502 when title is empty', () => {
    const bad = { ...VALID_REPORT, title: '' };
    expect(() => parseReport(JSON.stringify(bad))).toThrowError(AppError);
  });

  it('throws AppError 502 when bugReportMarkdown is empty', () => {
    const bad = { ...VALID_REPORT, bugReportMarkdown: '' };
    expect(() => parseReport(JSON.stringify(bad))).toThrowError(AppError);
  });
});
