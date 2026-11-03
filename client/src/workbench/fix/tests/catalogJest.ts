import type { ScenarioId } from '../remediation/types';

const IMPORT_TEST_API = `import { describe, expect, it } from 'vitest'; // in Jest these are globals, drop the import`;

/** Regression tests for Jest and Vitest, written against the "after" code of the same scenario. */
export const JEST_TESTS: Record<ScenarioId, string> = {
  'database-connection-refused': `${IMPORT_TEST_API}
import { connectWithRetry } from './database';

const noWait = async () => {};

describe('connectWithRetry', () => {
  it('keeps trying until the database accepts the connection', async () => {
    let calls = 0;
    const flaky = async () => {
      calls++;
      if (calls < 3) throw new Error('connect ECONNREFUSED 127.0.0.1:5432');
      return 'connected';
    };
    await expect(connectWithRetry(flaky, 6, noWait)).resolves.toBe('connected');
    expect(calls).toBe(3); // the old code gave up on the first refusal
  });

  it('gives up after the last attempt', async () => {
    const down = async () => {
      throw new Error('connect ECONNREFUSED 127.0.0.1:5432');
    };
    await expect(connectWithRetry(down, 2, noWait)).rejects.toThrow('ECONNREFUSED');
  });
});`,
  'connection-pool-exhausted': `${IMPORT_TEST_API}
import { withClient } from './pool';

function fakePool() {
  const state = { released: 0 };
  const pool = { connect: async () => ({ release: () => state.released++ }) };
  return { pool, state };
}

describe('withClient', () => {
  it('releases the client after the work succeeds', async () => {
    const { pool, state } = fakePool();
    await expect(withClient(pool as never, async () => 'row')).resolves.toBe('row');
    expect(state.released).toBe(1);
  });

  it('releases the client even when the work fails', async () => {
    const { pool, state } = fakePool();
    const failing = async () => {
      throw new Error('query failed');
    };
    await expect(withClient(pool as never, failing)).rejects.toThrow('query failed');
    expect(state.released).toBe(1); // the old code leaked the client here
  });
});`,
  'sql-injection': `${IMPORT_TEST_API}
import { findProductById } from './products';

const ATTACK = "1' OR '1'='1";

function fakeDatabase() {
  const calls: { sql: string; params: unknown[] }[] = [];
  const query = async (sql: string, params: unknown[]) => {
    calls.push({ sql, params });
    return [];
  };
  return { calls, query };
}

describe('findProductById', () => {
  it('sends the id as a parameter, never inside the SQL', async () => {
    const database = fakeDatabase();
    await findProductById(database as never, '42');
    expect(database.calls[0].sql).toBe('SELECT * FROM products WHERE id = $1');
    expect(database.calls[0].params).toEqual([42]);
  });

  it('rejects an injection payload before it reaches the database', async () => {
    const database = fakeDatabase();
    await expect(findProductById(database as never, ATTACK)).rejects.toThrow('Invalid product id');
    expect(database.calls).toHaveLength(0);
  });
});`,
  'null-access': `${IMPORT_TEST_API}
import { cityOf } from './user';

describe('cityOf', () => {
  it('returns the city in upper case', () => {
    expect(cityOf({ address: { city: 'rome' } } as never)).toBe('ROME');
  });

  it.each([undefined, {}, { address: null }, { address: {} }])(
    'falls back to UNKNOWN when a part is missing (%j)',
    (user) => {
      expect(cityOf(user as never)).toBe('UNKNOWN'); // the old code threw a TypeError
    },
  );
});`,
  'unhandled-rejection': `${IMPORT_TEST_API}
import { asyncHandler } from './asyncHandler';

const nextTick = () => new Promise((resolve) => setImmediate(resolve));

describe('asyncHandler', () => {
  it('forwards a rejection to next instead of leaving it unhandled', async () => {
    const failure = new Error('database down');
    const forwarded: unknown[] = [];
    const handler = asyncHandler(async () => {
      throw failure;
    });
    handler({} as never, {} as never, ((error: unknown) => forwarded.push(error)) as never);
    await nextTick();
    expect(forwarded).toEqual([failure]);
  });

  it('does not call next when the handler succeeds', async () => {
    const forwarded: unknown[] = [];
    const handler = asyncHandler(async () => 'done');
    handler({} as never, {} as never, ((error: unknown) => forwarded.push(error)) as never);
    await nextTick();
    expect(forwarded).toEqual([]);
  });
});`,
  'outbound-timeout': `${IMPORT_TEST_API}
import { fetchWithTimeout } from './http';

describe('fetchWithTimeout', () => {
  it('passes an abort signal so a hanging server cannot block forever', async () => {
    let signal: AbortSignal | null | undefined;
    const fetcher = async (_url: string, init?: RequestInit) => {
      signal = init?.signal;
      return new Response('ok');
    };
    await fetchWithTimeout('https://api.example.com', { fetcher: fetcher as typeof fetch });
    expect(signal).toBeDefined();
  });

  it('retries a failed attempt and then gives up', async () => {
    let calls = 0;
    const failing = async () => {
      calls++;
      throw new Error('timeout');
    };
    const options = { attempts: 3, fetcher: failing as unknown as typeof fetch };
    await expect(fetchWithTimeout('https://api.example.com', options)).rejects.toThrow('timeout');
    expect(calls).toBe(3);
  });
});`,
  'rate-limit-429': `${IMPORT_TEST_API}
import { fetchWithBackoff } from './client';

describe('fetchWithBackoff', () => {
  it('waits for Retry-After and then retries', async () => {
    const waits: number[] = [];
    const answers = [
      new Response('', { status: 429, headers: { 'retry-after': '2' } }),
      new Response('ok'),
    ];
    const fetcher = async () => answers.shift() as Response;
    const response = await fetchWithBackoff('https://api.example.com', {
      fetcher: fetcher as typeof fetch,
      wait: (async (milliseconds: number) => void waits.push(milliseconds)) as never,
    });
    expect(response.status).toBe(200);
    expect(waits).toEqual([2000]);
  });

  it('stops after the last attempt', async () => {
    const fetcher = async () => new Response('', { status: 429 });
    const options = { attempts: 2, fetcher: fetcher as typeof fetch, wait: (async () => {}) as never };
    await expect(fetchWithBackoff('https://api.example.com', options)).rejects.toThrow(
      'Still rate limited',
    );
  });
});`,
  'out-of-memory': `${IMPORT_TEST_API}
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { processFile } from './processFile';

function fileWith(content: string): string {
  const path = join(mkdtempSync(join(tmpdir(), 'lines-')), 'input.log');
  writeFileSync(path, content);
  return path;
}

describe('processFile', () => {
  it('handles every line, one at a time', async () => {
    const seen: string[] = [];
    const count = await processFile(fileWith('a\\nb\\nc\\n'), (line) => void seen.push(line));
    expect(seen).toEqual(['a', 'b', 'c']);
    expect(count).toBe(3);
  });

  it('handles nothing for an empty file', async () => {
    const seen: string[] = [];
    expect(await processFile(fileWith(''), (line) => void seen.push(line))).toBe(0);
    expect(seen).toEqual([]);
  });
});`,
  'expired-certificate': `${IMPORT_TEST_API}
import { daysUntil } from './certificate';

const VALID_TO = 'Jan  1 00:00:00 2030 GMT'; // the format of X509Certificate.validTo

describe('daysUntil', () => {
  it('counts the whole days left', () => {
    expect(daysUntil(VALID_TO, new Date('2029-12-22T00:00:00Z'))).toBe(10);
  });

  it('is negative once the certificate has expired', () => {
    expect(daysUntil(VALID_TO, new Date('2030-01-03T00:00:00Z'))).toBeLessThan(0);
  });
});`,
  'cors-blocked': `${IMPORT_TEST_API}
import { resolveAllowedOrigin } from './cors';

describe('resolveAllowedOrigin', () => {
  it('echoes an origin from the allowlist', () => {
    expect(resolveAllowedOrigin('https://app.example.com')).toBe('https://app.example.com');
  });

  it.each([undefined, '', 'https://evil.example.com', 'https://app.example.com.evil.io'])(
    'refuses %j',
    (origin) => {
      expect(resolveAllowedOrigin(origin)).toBeNull(); // never answer with *
    },
  );
});`,
  'missing-environment-variable': `${IMPORT_TEST_API}
import { loadConfig } from './config';

const VALID = { DATABASE_URL: 'postgres://db/app', SESSION_SECRET: 'not-a-real-secret' };

describe('loadConfig', () => {
  it('reads the required values and applies the default port', () => {
    expect(loadConfig(VALID)).toMatchObject({ databaseUrl: 'postgres://db/app', port: 3000 });
  });

  it('names every missing variable without printing any value', () => {
    expect(() => loadConfig({ DATABASE_URL: '' })).toThrow(
      'Missing environment variables: DATABASE_URL, SESSION_SECRET',
    );
  });
});`,
  'json-parse-error': `${IMPORT_TEST_API}
import { parseJsonBody } from './body';

describe('parseJsonBody', () => {
  it('returns the parsed value of a valid body', () => {
    expect(parseJsonBody('{"quantity":2}')).toEqual({ ok: true, value: { quantity: 2 } });
  });

  it.each(['{"quantity":', 'not json', '', '   ', undefined])(
    'answers with an error instead of throwing for %j',
    (body) => {
      expect(parseJsonBody(body)).toMatchObject({ ok: false });
    },
  );
});`,
  'path-traversal': `${IMPORT_TEST_API}
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { resolveInside } from './safePaths';

const BASE = join(tmpdir(), 'uploads');

describe('resolveInside', () => {
  it('accepts a file inside the folder', () => {
    expect(resolveInside(BASE, 'report.pdf')).toBe(join(BASE, 'report.pdf'));
  });

  it.each(['../secret.txt', '../../etc/passwd', '/etc/passwd', 'a/../../b', 'x\\0y'])(
    'refuses %j',
    (requested) => {
      expect(resolveInside(BASE, requested)).toBeNull();
    },
  );
});`,
  'brute-force-login': `${IMPORT_TEST_API}
import { createLoginLimiter } from './loginLimiter';

describe('createLoginLimiter', () => {
  it('locks the account on the fifth failure', () => {
    const limiter = createLoginLimiter({ maxFailures: 5, windowMs: 60_000, lockMs: 60_000 });
    for (let attempt = 0; attempt < 4; attempt++) limiter.recordFailure('alice', attempt);
    expect(limiter.isLocked('alice', 10)).toBe(false);
    limiter.recordFailure('alice', 4);
    expect(limiter.isLocked('alice', 10)).toBe(true);
    expect(limiter.isLocked('alice', 60_005)).toBe(false); // the lock expires
  });

  it('does not count old failures or other accounts', () => {
    const limiter = createLoginLimiter({ maxFailures: 2, windowMs: 1_000, lockMs: 1_000 });
    limiter.recordFailure('alice', 0);
    limiter.recordFailure('alice', 5_000);
    limiter.recordFailure('bob', 5_000);
    expect(limiter.isLocked('alice', 5_001)).toBe(false);
    expect(limiter.isLocked('bob', 5_001)).toBe(false);
  });

  it('forgets the failures after a good login', () => {
    const limiter = createLoginLimiter({ maxFailures: 2 });
    limiter.recordFailure('alice', 0);
    limiter.recordFailure('alice', 1);
    limiter.reset('alice');
    expect(limiter.isLocked('alice', 2)).toBe(false);
  });
});`,
  'file-descriptor-leak': `${IMPORT_TEST_API}
import { readFirstLine } from './files';

function fakeOpener(readFile: () => Promise<string>) {
  const state = { closed: 0 };
  const opener = async () => ({ readFile, close: async () => void state.closed++ });
  return { opener: opener as never, state };
}

describe('readFirstLine', () => {
  it('closes the file after reading', async () => {
    const { opener, state } = fakeOpener(async () => 'first\\nsecond');
    await expect(readFirstLine('data.txt', opener)).resolves.toBe('first');
    expect(state.closed).toBe(1);
  });

  it('closes the file even when reading fails', async () => {
    const { opener, state } = fakeOpener(async () => {
      throw new Error('disk error');
    });
    await expect(readFirstLine('data.txt', opener)).rejects.toThrow('disk error');
    expect(state.closed).toBe(1); // the old code leaked the descriptor here
  });
});`,
};
