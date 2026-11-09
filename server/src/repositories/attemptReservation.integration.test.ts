import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The hourly limits against a REAL PostgreSQL, with real concurrent connections: the in-memory
 * stand-in of attemptReservation.test.ts only proves that the code asks for the lock.
 *
 * It runs only when TEST_DATABASE_URL points to a database whose tables already exist
 * (`DIRECT_URL=<url> npx prisma db push`). In CI a PostgreSQL service provides it. Without the
 * variable the tests are skipped, so `npm test` still needs no database. For safety the test
 * refuses any host that is not the local machine: it empties the AnalysisAttempt table.
 */
const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const LOCAL_HOSTS = ['localhost', '127.0.0.1', '[::1]', '::1'];

function assertLocalDatabase(url: string): void {
  const host = new URL(url).hostname;
  if (!LOCAL_HOSTS.includes(host)) {
    throw new Error(`TEST_DATABASE_URL must point to this machine, not to "${host}".`);
  }
}

describe.skipIf(!testDatabaseUrl)('tryReserveAttempt on a real PostgreSQL', () => {
  let tryReserveAttempt: typeof import('./analysisRepository').tryReserveAttempt;
  let prisma: typeof import('../db/prisma').prisma;

  beforeAll(async () => {
    assertLocalDatabase(testDatabaseUrl as string);
    vi.stubEnv('DATABASE_URL', testDatabaseUrl as string);
    vi.resetModules();
    ({ tryReserveAttempt } = await import('./analysisRepository'));
    ({ prisma } = await import('../db/prisma'));
  });

  afterAll(async () => {
    await prisma.$disconnect();
    vi.unstubAllEnvs();
  });

  beforeEach(async () => {
    await prisma.analysisAttempt.deleteMany();
  });

  it('lets exactly the allowed number of simultaneous requests through, per client', async () => {
    const limits = { perClientPerHour: 3, globalPerHour: 0 };

    const decisions = await Promise.all(
      Array.from({ length: 12 }, () => tryReserveAttempt('client-a', limits)),
    );

    expect(decisions.filter((decision) => decision === 'allowed')).toHaveLength(3);
    expect(decisions.filter((decision) => decision === 'client-limit')).toHaveLength(9);
    expect(await prisma.analysisAttempt.count({ where: { clientHash: 'client-a' } })).toBe(3);
  });

  it('applies the global limit to simultaneous requests from different clients', async () => {
    const limits = { perClientPerHour: 0, globalPerHour: 4 };

    const decisions = await Promise.all(
      Array.from({ length: 10 }, (_unused, index) => tryReserveAttempt(`client-${index}`, limits)),
    );

    expect(decisions.filter((decision) => decision === 'allowed')).toHaveLength(4);
    expect(decisions.filter((decision) => decision === 'global-limit')).toHaveLength(6);
    expect(await prisma.analysisAttempt.count()).toBe(4);
  });

  it('does not write the attempt that it refuses', async () => {
    const limits = { perClientPerHour: 1, globalPerHour: 0 };

    await tryReserveAttempt('client-a', limits);
    const refused = await tryReserveAttempt('client-a', limits);

    expect(refused).toBe('client-limit');
    expect(await prisma.analysisAttempt.count()).toBe(1);
  });

  it('keeps one client from using up the places of another', async () => {
    const limits = { perClientPerHour: 2, globalPerHour: 0 };

    await Promise.all([
      tryReserveAttempt('client-a', limits),
      tryReserveAttempt('client-a', limits),
      tryReserveAttempt('client-a', limits),
    ]);
    const other = await tryReserveAttempt('client-b', limits);

    expect(other).toBe('allowed');
  });

  it('forgets attempts older than one hour and frees their place', async () => {
    const limits = { perClientPerHour: 1, globalPerHour: 0 };
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    await prisma.analysisAttempt.create({
      data: { clientHash: 'client-a', createdAt: twoHoursAgo },
    });

    const decision = await tryReserveAttempt('client-a', limits);

    expect(decision).toBe('allowed');
    expect(await prisma.analysisAttempt.count()).toBe(1);
  });
});
