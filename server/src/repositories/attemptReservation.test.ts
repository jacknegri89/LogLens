import { beforeEach, describe, expect, it, vi } from 'vitest';

import { tryReserveAttempt } from './analysisRepository';

/**
 * The transaction is run against a small in-memory stand-in for the database. It reproduces what
 * the real one does that matters here: every operation lets other requests run in between, and
 * `pg_advisory_xact_lock` makes the transactions that ask for it take turns. It does NOT prove the
 * behaviour of PostgreSQL itself, only that the code takes the lock before it counts and writes.
 */
const { database, prisma } = vi.hoisted(() => {
  interface Row {
    id: number;
    clientHash: string;
    createdAt: Date;
  }
  const state = {
    rows: [] as Row[],
    nextId: 1,
    lockHeld: false,
    waiting: [] as (() => void)[],
    log: [] as string[],
  };
  const pause = () => new Promise<void>((resolve) => setImmediate(resolve));

  async function takeLock() {
    if (state.lockHeld) {
      await new Promise<void>((resolve) => state.waiting.push(resolve));
    }
    state.lockHeld = true;
  }
  function releaseLock() {
    state.lockHeld = false;
    state.waiting.shift()?.();
  }

  function transaction() {
    return {
      $executeRaw: async (strings: TemplateStringsArray) => {
        state.log.push(strings.join('?'));
        await takeLock();
      },
      analysisAttempt: {
        deleteMany: async ({ where }: { where: { createdAt: { lt: Date } } }) => {
          await pause();
          state.rows = state.rows.filter((row) => row.createdAt >= where.createdAt.lt);
        },
        count: async ({ where }: { where: { clientHash?: string; createdAt: { gte: Date } } }) => {
          await pause();
          return state.rows.filter(
            (row) =>
              row.createdAt >= where.createdAt.gte &&
              (where.clientHash === undefined || row.clientHash === where.clientHash),
          ).length;
        },
        create: async ({ data }: { data: { clientHash: string } }) => {
          await pause();
          state.rows.push({
            id: state.nextId++,
            clientHash: data.clientHash,
            createdAt: new Date(),
          });
        },
      },
    };
  }

  return {
    database: state,
    prisma: {
      $transaction: async (run: (tx: ReturnType<typeof transaction>) => Promise<unknown>) => {
        try {
          return await run(transaction());
        } finally {
          releaseLock();
        }
      },
    },
  };
});

vi.mock('../db/prisma', () => ({ prisma }));

const LIMITS = { perClientPerHour: 2, globalPerHour: 5 };

beforeEach(() => {
  database.rows = [];
  database.nextId = 1;
  database.lockHeld = false;
  database.waiting = [];
  database.log = [];
});

describe('tryReserveAttempt', () => {
  it('takes the advisory lock before it counts or writes anything', async () => {
    await tryReserveAttempt('hash-a', LIMITS);

    expect(database.log).toHaveLength(1);
    expect(database.log[0]).toContain('pg_advisory_xact_lock');
  });

  it('lets exactly the allowed number through when six requests arrive together', async () => {
    const decisions = await Promise.all(
      Array.from({ length: 6 }, () => tryReserveAttempt('hash-a', LIMITS)),
    );

    expect(decisions.filter((decision) => decision === 'allowed')).toHaveLength(2);
    expect(decisions.filter((decision) => decision === 'client-limit')).toHaveLength(4);
    expect(database.rows).toHaveLength(2);
  });

  it('never writes a refused attempt, so it cannot be counted against anybody else', async () => {
    await Promise.all(Array.from({ length: 6 }, () => tryReserveAttempt('hash-a', LIMITS)));

    expect(database.rows.every((row) => row.clientHash === 'hash-a')).toBe(true);
    expect(database.rows).toHaveLength(LIMITS.perClientPerHour);
  });

  it('respects the global limit across clients that arrive together', async () => {
    const decisions = await Promise.all(
      Array.from({ length: 12 }, (_, index) => tryReserveAttempt(`hash-${index}`, LIMITS)),
    );

    expect(decisions.filter((decision) => decision === 'allowed')).toHaveLength(5);
    expect(decisions.filter((decision) => decision === 'global-limit')).toHaveLength(7);
    expect(database.rows).toHaveLength(5);
  });

  it('does not let one client use up the places of the others below the global limit', async () => {
    await Promise.all(Array.from({ length: 4 }, () => tryReserveAttempt('hash-a', LIMITS)));

    const other = await tryReserveAttempt('hash-b', LIMITS);

    expect(other).toBe('allowed');
  });

  it('forgets attempts older than one hour', async () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    database.rows = [
      { id: 90, clientHash: 'hash-a', createdAt: twoHoursAgo },
      { id: 91, clientHash: 'hash-a', createdAt: twoHoursAgo },
    ];

    const decision = await tryReserveAttempt('hash-a', LIMITS);

    expect(decision).toBe('allowed');
    expect(database.rows).toHaveLength(1);
  });

  it('turns a limit off when it is 0', async () => {
    const decisions = await Promise.all(
      Array.from({ length: 8 }, () =>
        tryReserveAttempt('hash-a', { perClientPerHour: 0, globalPerHour: 0 }),
      ),
    );

    expect(decisions.every((decision) => decision === 'allowed')).toBe(true);
  });

  it('refuses without writing when the client is already at the limit', async () => {
    await tryReserveAttempt('hash-a', LIMITS);
    await tryReserveAttempt('hash-a', LIMITS);
    const before = database.rows.length;

    const decision = await tryReserveAttempt('hash-a', LIMITS);

    expect(decision).toBe('client-limit');
    expect(database.rows).toHaveLength(before);
  });
});
