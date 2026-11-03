import { describe, expect, it } from 'vitest';

import type { AnalysisRecord } from '../../../lib/types';
import { fromBase64Url, toBase64Url } from './base64url';
import { buildShareState } from './buildShareState';
import { deflate } from './compression';
import { PermalinkError } from './permalinkError';
import { decodePermalinkState, encodePermalinkState, REFUSE_LINK_LENGTH } from './permalinkCodec';
import { validatePermalinkState, type PermalinkState } from './permalinkState';
import { buildPermalinkUrl, readPermalinkData } from './permalinkUrl';

const REPORT_STATE: PermalinkState = {
  v: 1,
  language: 'it',
  log: '2026-11-03T10:00:00Z ERROR db timeout\nsecond line',
  report: {
    title: 'Database timeout',
    severity: 'high',
    category: 'database',
    report: {
      keyLines: ['ERROR db timeout'],
      causes: ['Pool exhausted'],
      debugSteps: ['Check the pool size'],
      bugReportMarkdown: '# Bug\n\nDetails',
      format: 'Plain',
      findings: [
        {
          title: 'Timeout',
          severity: 'high',
          category: 'database',
          evidence: 'db timeout',
          technique: 'T1499',
        },
      ],
      overview: ['One root cause'],
      timeline: [
        {
          time: '10:00:00',
          title: 'Timeout',
          category: 'database',
          severity: 'high',
          role: 'root',
          evidence: 'x',
        },
        {
          title: 'Retry',
          category: 'api',
          severity: 'low',
          role: 'effect',
          evidence: 'y',
          causedBy: 0,
        },
      ],
    },
  },
};

async function failureCodeOf(action: Promise<unknown>): Promise<string> {
  try {
    await action;
  } catch (failure) {
    return failure instanceof PermalinkError ? failure.code : 'other';
  }
  return 'none';
}

describe('base64url', () => {
  it('round-trips any bytes without +, / or =', () => {
    const bytes = Uint8Array.from({ length: 256 }, (_unused, value) => value);
    const text = toBase64Url(bytes);
    expect(text).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(Array.from(fromBase64Url(text))).toEqual(Array.from(bytes));
  });

  it('refuses characters outside the alphabet and impossible lengths', () => {
    expect(() => fromBase64Url('ab+/')).toThrow(PermalinkError);
    expect(() => fromBase64Url('abc=')).toThrow(PermalinkError);
    expect(() => fromBase64Url('abcde')).toThrow(PermalinkError);
  });
});

describe('encode and decode', () => {
  it('round-trips a state with a report', async () => {
    const data = await encodePermalinkState(REPORT_STATE);
    expect(data).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(await decodePermalinkState(data)).toEqual(REPORT_STATE);
  });

  it('round-trips a log with no report and non-ASCII text', async () => {
    const state: PermalinkState = {
      v: 1,
      language: 'en',
      log: 'caffè ☕ \u{1F680}\n"quotes" \\ tab\t',
    };
    expect(await decodePermalinkState(await encodePermalinkState(state))).toEqual(state);
  });

  it('compresses repeated log lines well below their size', async () => {
    const log = 'GET /api/orders 200 12ms\n'.repeat(2000);
    const data = await encodePermalinkState({ v: 1, language: 'en', log });
    expect(data.length).toBeLessThan(log.length / 20);
  });

  it('refuses to build a link above the size limit', async () => {
    let seed = 1;
    const noisy = Array.from({ length: 1_200_000 }, () => {
      seed = (seed * 48271) % 2147483647;
      return seed.toString(36).slice(-2);
    }).join('');
    expect(await failureCodeOf(encodePermalinkState({ v: 1, language: 'en', log: noisy }))).toBe(
      'too-large',
    );
  });
});

describe('decoding bad data', () => {
  it('rejects text that is not base64url', async () => {
    expect(await failureCodeOf(decodePermalinkState('not valid!'))).toBe('corrupt');
  });

  it('rejects bytes that are not deflate data', async () => {
    expect(
      await failureCodeOf(decodePermalinkState(toBase64Url(new Uint8Array(40).fill(255)))),
    ).toBe('corrupt');
  });

  it('rejects a truncated link', async () => {
    const data = await encodePermalinkState(REPORT_STATE);
    expect(await failureCodeOf(decodePermalinkState(data.slice(0, data.length - 12)))).toBe(
      'corrupt',
    );
  });

  it('rejects compressed text that is not JSON', async () => {
    const data = toBase64Url(await deflate(new TextEncoder().encode('{"v": 1, broken')));
    expect(await failureCodeOf(decodePermalinkState(data))).toBe('corrupt');
  });

  it('rejects valid JSON of the wrong shape', async () => {
    const data = toBase64Url(await deflate(new TextEncoder().encode('{"v":1,"language":"it"}')));
    expect(await failureCodeOf(decodePermalinkState(data))).toBe('invalid');
  });

  it('rejects data longer than the limit before decoding it', async () => {
    expect(await failureCodeOf(decodePermalinkState('a'.repeat(REFUSE_LINK_LENGTH + 1)))).toBe(
      'too-large',
    );
  });

  it('stops a small link that expands into a huge text', async () => {
    const bomb = new TextEncoder().encode(
      `{"v":1,"language":"en","log":"${'a'.repeat(40_000_000)}"}`,
    );
    const data = toBase64Url(await deflate(bomb));
    expect(data.length).toBeLessThan(200_000);
    expect(await failureCodeOf(decodePermalinkState(data))).toBe('too-large');
  });
});

describe('validatePermalinkState', () => {
  it.each([
    ['null', null],
    ['an array', []],
    ['a wrong version', { v: 2, language: 'en', log: '' }],
    ['an unknown language', { v: 1, language: 'fr', log: '' }],
    ['a log that is not text', { v: 1, language: 'en', log: 5 }],
    ['a report that is not an object', { v: 1, language: 'en', log: '', report: 'x' }],
    [
      'a bad severity',
      { v: 1, language: 'en', log: '', report: { ...REPORT_STATE.report, severity: 'huge' } },
    ],
    [
      'a bad list',
      {
        v: 1,
        language: 'en',
        log: '',
        report: { ...REPORT_STATE.report, report: { keyLines: 'x' } },
      },
    ],
  ])('rejects %s', (_name, value) => {
    expect(() => validatePermalinkState(value)).toThrow(PermalinkError);
  });

  it('rejects a timeline entry with a wrong role or a bad pointer', () => {
    const report = REPORT_STATE.report!;
    const withEntry = (entry: unknown) => ({
      v: 1,
      language: 'en',
      log: '',
      report: { ...report, report: { ...report.report, timeline: [entry] } },
    });
    const entry = { title: 't', category: 'c', severity: 'low', evidence: 'e' };
    expect(() => validatePermalinkState(withEntry({ ...entry, role: 'boss' }))).toThrow(
      PermalinkError,
    );
    expect(() =>
      validatePermalinkState(withEntry({ ...entry, role: 'root', causedBy: -1 })),
    ).toThrow(PermalinkError);
    expect(() =>
      validatePermalinkState(withEntry({ ...entry, role: 'root', causedBy: 1.5 })),
    ).toThrow(PermalinkError);
  });

  it('copies only the known fields', () => {
    const polluted = JSON.parse(
      '{"v":1,"language":"en","log":"x","__proto__":{"admin":true},"extra":"y"}',
    );
    const state = validatePermalinkState(polluted);
    expect(Object.keys(state)).toEqual(['v', 'language', 'log']);
    expect(({} as Record<string, unknown>).admin).toBeUndefined();
  });
});

describe('url', () => {
  it('builds the address and reads the data back from a hash', () => {
    const url = buildPermalinkUrl('https://loglens-demo.vercel.app', 'abc_-123');
    expect(url).toBe('https://loglens-demo.vercel.app/workbench#s=abc_-123');
    expect(readPermalinkData('#s=abc_-123')).toBe('abc_-123');
  });

  it('ignores other hashes', () => {
    expect(readPermalinkData('')).toBeNull();
    expect(readPermalinkData('#section')).toBeNull();
    expect(readPermalinkData('#x=1')).toBeNull();
  });
});

describe('buildShareState', () => {
  const record = {
    id: '1',
    createdAt: '2026-11-03T10:00:00Z',
    source: 'paste',
    fileName: null,
    rawLog: 'ignored',
    title: 'Failure from 203.0.113.9',
    severity: 'high',
    category: 'auth',
    helpful: null,
    shareToken: null,
    report: {
      keyLines: ['login by ana@example.com from 203.0.113.9'],
      causes: ['password=hunter2 was rejected'],
      debugSteps: [],
      bugReportMarkdown: 'Seen at 203.0.113.9',
    },
  } satisfies AnalysisRecord;

  it('removes sensitive values from the log and the report with one numbering', () => {
    const log = 'login by ana@example.com from 203.0.113.9 password=hunter2';
    const { state, occurrences } = buildShareState('en', log, record);
    const shared = JSON.stringify(state);
    for (const secret of ['ana@example.com', '203.0.113.9', 'hunter2']) {
      expect(shared).not.toContain(secret);
    }
    expect(state.log).toBe('login by EMAIL-1 from IP-1 password=SECRET-1');
    expect(state.report?.report.keyLines[0]).toBe('login by EMAIL-1 from IP-1');
    expect(state.report?.title).toBe('Failure from IP-1');
    expect(occurrences).toBeGreaterThan(3);
  });

  it('shares the log alone when there is no analysis', () => {
    const { state } = buildShareState('it', 'plain line', null);
    expect(state).toEqual({ v: 1, language: 'it', log: 'plain line' });
  });

  it('builds a state that survives the round trip', async () => {
    const { state } = buildShareState('en', 'from 203.0.113.9', record);
    expect(await decodePermalinkState(await encodePermalinkState(state))).toEqual(state);
  });
});
