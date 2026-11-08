import type { Request, Response } from 'express';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AppError, describeErrorForLog, errorHandler, isDatabaseUnavailable } from './errorHandler';

function respondTo(error: unknown) {
  const json = vi.fn();
  const status = vi.fn().mockReturnValue({ json });
  errorHandler(error, {} as Request, { status } as unknown as Response, vi.fn());
  return { status, json };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('errorHandler', () => {
  it('passes the status and message of an error thrown on purpose', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const { status, json } = respondTo(new AppError(429, 'Slow down.'));

    expect(status).toHaveBeenCalledWith(429);
    expect(json).toHaveBeenCalledWith({ error: { message: 'Slow down.', statusCode: 429 } });
    expect(console.error).not.toHaveBeenCalled();
  });

  it('answers 503, not 500, when the database cannot be reached', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const unreachable = Object.assign(new Error("Can't reach database server"), { code: 'P1001' });

    const { status, json } = respondTo(unreachable);

    expect(status).toHaveBeenCalledWith(503);
    expect(JSON.stringify(json.mock.calls[0][0])).not.toContain('database server');
  });

  it('recognises an unreachable database in the cause of an error', () => {
    const wrapped = new Error('query failed', {
      cause: Object.assign(new Error('x'), { code: 'ECONNREFUSED' }),
    });

    expect(isDatabaseUnavailable(wrapped)).toBe(true);
    expect(isDatabaseUnavailable(new Error('a bug'))).toBe(false);
  });

  it('answers a generic 500 for a bug and tells the visitor nothing about it', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const { status, json } = respondTo(new TypeError('cannot read property x of undefined'));

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({
      error: { message: 'Internal Server Error', statusCode: 500 },
    });
  });
});

describe('what an unexpected error writes to the server log', () => {
  const SECRET_LOG = 'ERROR login failed password=hunter2-FAKE-pw for anna.rossi@example.com';

  it('does not include the data a database error carries in its message', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const databaseError = new Error(
      [
        '',
        'Invalid `prisma.analysis.create()` invocation:',
        '',
        '{ data: { rawLog: "' + SECRET_LOG + '", owner: "visitor-0123456789abcdef" } }',
        '',
        'Unique constraint failed',
      ].join('\n'),
    );

    respondTo(databaseError);

    const logged = JSON.stringify(spy.mock.calls);
    expect(logged).toContain('Invalid `prisma.analysis.create()` invocation');
    expect(logged).not.toContain('hunter2-FAKE-pw');
    expect(logged).not.toContain('anna.rossi');
    expect(logged).not.toContain('visitor-0123456789abcdef');
  });

  it('masks a secret even when it is on the first line of the message', () => {
    const description = describeErrorForLog(new Error('connect failed password=hunter2-FAKE-pw'));

    expect(JSON.stringify(description)).not.toContain('hunter2-FAKE-pw');
  });

  it('describes a thrown value that is not an error without printing it', () => {
    expect(describeErrorForLog('password=hunter2-FAKE-pw')).toEqual({ type: 'string' });
  });
});
