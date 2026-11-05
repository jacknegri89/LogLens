import { describe, expect, it } from 'vitest';

import { WORKBENCH_EXPLORER_TEXT } from '../../content/workbenchExplorer';
import { LANGUAGES } from '../../i18n/languages';
import { parseLines } from '../core/basicParse';
import { PRESET_IDS, PRESET_LOGS } from './presetLogs';

describe('preset logs', () => {
  it.each(PRESET_IDS)('%s is a realistic incident: 30-70 lines, timed, with faults', (id) => {
    const lines = parseLines(PRESET_LOGS[id]);
    const timed = lines.filter((line) => line.timestamp !== null);

    expect(lines.length).toBeGreaterThanOrEqual(30);
    expect(lines.length).toBeLessThanOrEqual(70);
    expect(lines.some((line) => line.isFault)).toBe(true);
    expect(lines.some((line) => line.level === 'INFO')).toBe(true);
    expect(timed.length / lines.length).toBeGreaterThan(0.6);
    expect(lines.some((line) => line.fields.trace_id || line.fields.request_id)).toBe(true);
  });

  it('carries the signature error of each scenario', () => {
    expect(PRESET_LOGS.prismaPool).toContain('P2024');
    expect(PRESET_LOGS.fastapiRedis).toContain('BusyLoadingError');
    expect(PRESET_LOGS.kubernetesOom).toContain('exitCode=137');
    expect(PRESET_LOGS.tokioPanic).toContain("thread 'tokio-runtime-worker' panicked at");
    expect(PRESET_LOGS.grpcCertificate).toContain('x509: certificate has expired');
    expect(PRESET_LOGS.edgeRateLimit).toContain('EDGE_FUNCTION_INVOCATION_TIMEOUT');
  });
});

describe('explorer text table', () => {
  function shapeOf(value: unknown): unknown {
    if (typeof value !== 'object' || value === null) {
      return typeof value;
    }
    return Object.fromEntries(Object.entries(value).map(([key, inner]) => [key, shapeOf(inner)]));
  }

  it('has the same keys in every language and a title for every preset', () => {
    for (const language of LANGUAGES) {
      expect(shapeOf(WORKBENCH_EXPLORER_TEXT[language])).toEqual(
        shapeOf(WORKBENCH_EXPLORER_TEXT.en),
      );
      for (const id of PRESET_IDS) {
        expect(WORKBENCH_EXPLORER_TEXT[language].presets[id].title.trim()).not.toBe('');
      }
    }
  });

  it('formats counts in each language', () => {
    expect(WORKBENCH_EXPLORER_TEXT.en.explorer.matchCount(1200, 50000)).toBe(
      '1,200 of 50,000 lines',
    );
    expect(WORKBENCH_EXPLORER_TEXT.it.explorer.matchCount(1, 1)).toBe('1 riga');
    expect(WORKBENCH_EXPLORER_TEXT.it.loader.lineCount(12000)).toBe('12.000 righe');
  });
});
