import { describe, expect, it } from 'vitest';

import type { AnalysisRecord } from '../../../lib/types';
import { SCENARIO_IDS, type ScenarioId } from './types';
import { rankScenarios, selectScenario, signalsFromRecord, type AnalysisSignals } from './select';

function signals(overrides: Partial<AnalysisSignals>): AnalysisSignals {
  return {
    title: '',
    category: '',
    keyLines: [],
    causes: [],
    debugSteps: [],
    findingTitles: [],
    ...overrides,
  };
}

const INCIDENTS: [ScenarioId, Partial<AnalysisSignals>][] = [
  [
    'database-connection-refused',
    {
      title: 'connect ECONNREFUSED 10.0.2.15:5432',
      category: 'Database',
      keyLines: ['Error: connect ECONNREFUSED 10.0.2.15:5432'],
    },
  ],
  [
    'connection-pool-exhausted',
    {
      title: 'Connection pool exhausted',
      category: 'Database',
      keyLines: ['HikariPool-1 - Connection is not available, request timed out after 30000ms'],
      causes: ['Connections are borrowed from the pool and never returned.'],
    },
  ],
  [
    'sql-injection',
    {
      title: 'GET /products?id=1%27%20OR%201%3D1-- returned 500',
      category: 'Security Attack',
      keyLines: ['GET /products?id=1%27%20OR%201%3D1-- HTTP/1.1 500 "sqlmap/1.8"'],
      debugSteps: ['Replace string concatenation in the query with a prepared statement.'],
    },
  ],
  [
    'null-access',
    {
      title: "TypeError: Cannot read properties of undefined (reading 'city')",
      category: 'Runtime',
    },
  ],
  [
    'unhandled-rejection',
    {
      title:
        'UnhandledPromiseRejection: This error originated either by throwing inside of an async function',
      category: 'Runtime',
    },
  ],
  [
    'outbound-timeout',
    {
      title: 'Request to payments-api timed out after 30000ms (ETIMEDOUT)',
      category: 'Network',
    },
  ],
  [
    'rate-limit-429',
    {
      title: 'HTTP 429 Too Many Requests from api.partner.com',
      category: 'Rate Limit',
      keyLines: ['WARN upstream returned 429 Too Many Requests, Retry-After: 30'],
    },
  ],
  [
    'out-of-memory',
    {
      title: 'java.lang.OutOfMemoryError: Java heap space',
      category: 'Infrastructure',
    },
  ],
  [
    'expired-certificate',
    {
      title: 'TLS handshake failed: certificate has expired',
      category: 'Network',
      keyLines: ['x509: certificate has expired or is not yet valid'],
    },
  ],
  [
    'cors-blocked',
    {
      title: 'Access to fetch blocked by CORS policy: No Access-Control-Allow-Origin header',
      category: 'Network',
    },
  ],
  [
    'missing-environment-variable',
    {
      title: 'Environment variable DATABASE_URL is not set',
      category: 'Runtime',
    },
  ],
  [
    'json-parse-error',
    {
      title: 'SyntaxError: Unexpected token } in JSON at position 41',
      category: 'Client Error',
    },
  ],
  [
    'path-traversal',
    {
      title: 'GET /download?name=../../etc/passwd returned 200',
      category: 'Security Attack',
      keyLines: ['GET /download?name=../../etc/passwd HTTP/1.1'],
    },
  ],
  [
    'brute-force-login',
    {
      title: 'Failed password for root from 203.0.113.9 (50 attempts)',
      category: 'Authentication',
      keyLines: ['sshd: Failed password for invalid user admin from 203.0.113.9'],
    },
  ],
  [
    'file-descriptor-leak',
    {
      title: 'EMFILE: too many open files, open /app/data.json',
      category: 'Infrastructure',
    },
  ],
];

describe('selectScenario', () => {
  it.each(INCIDENTS)('picks %s for its incident', (expected, overrides) => {
    const choice = selectScenario(signals(overrides));
    expect(choice.id).toBe(expected);
    expect(choice.matched).toBe(true);
  });

  it('covers every scenario of the catalog with a sample incident', () => {
    expect(INCIDENTS.map(([id]) => id).sort()).toEqual([...SCENARIO_IDS].sort());
  });

  it('reads the Italian wording of the causes too', () => {
    const choice = selectScenario(signals({ causes: ['Connessione rifiutata dal database.'] }));
    expect(choice.id).toBe('database-connection-refused');
  });

  it('reports no match, and keeps the catalog order, when nothing points to a scenario', () => {
    const choice = selectScenario(
      signals({ title: 'Service started', category: 'Normal Traffic' }),
    );
    expect(choice).toEqual({ id: SCENARIO_IDS[0], matched: false });
  });

  it('is not case sensitive', () => {
    expect(selectScenario(signals({ title: 'ECONNREFUSED' })).id).toBe(
      selectScenario(signals({ title: 'econnrefused' })).id,
    );
  });
});

describe('rankScenarios', () => {
  it('lists every scenario once, best first', () => {
    const ranked = rankScenarios(signals({ title: 'EMFILE: too many open files' }));
    expect(ranked).toHaveLength(SCENARIO_IDS.length);
    expect(ranked[0].id).toBe('file-descriptor-leak');
    const scores = ranked.map((entry) => entry.score);
    expect(scores).toEqual([...scores].sort((first, second) => second - first));
  });
});

describe('signalsFromRecord', () => {
  it('collects the title, category, lines, causes, steps and finding titles', () => {
    const record = {
      title: 'T',
      category: 'C',
      report: {
        keyLines: ['k'],
        causes: ['c'],
        debugSteps: ['s'],
        findings: [{ title: 'F' }],
      },
    } as unknown as AnalysisRecord;
    expect(signalsFromRecord(record)).toEqual({
      title: 'T',
      category: 'C',
      keyLines: ['k'],
      causes: ['c'],
      debugSteps: ['s'],
      findingTitles: ['F'],
    });
  });

  it('accepts a report without findings', () => {
    const record = {
      title: 'T',
      category: 'C',
      report: { keyLines: [], causes: [], debugSteps: [] },
    } as unknown as AnalysisRecord;
    expect(signalsFromRecord(record).findingTitles).toEqual([]);
  });
});
