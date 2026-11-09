import { beforeEach, describe, expect, it, vi } from 'vitest';

import { reserveAttempt } from './attemptLimit';

const { repository } = vi.hoisted(() => ({
  repository: { tryReserveAttempt: vi.fn() },
}));

vi.mock('../repositories/analysisRepository', () => repository);
vi.mock('../config/env', () => ({
  env: { RATE_LIMIT_PER_HOUR: 2, GLOBAL_LIMIT_PER_HOUR: 100 },
}));

describe('reserveAttempt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('asks the repository with the limits of the configuration', async () => {
    repository.tryReserveAttempt.mockResolvedValue('allowed');

    await reserveAttempt('hash-a');

    expect(repository.tryReserveAttempt).toHaveBeenCalledWith('hash-a', {
      perClientPerHour: 2,
      globalPerHour: 100,
    });
  });

  it('refuses with 429 and the hourly limit when the client is over it', async () => {
    repository.tryReserveAttempt.mockResolvedValue('client-limit');

    await expect(reserveAttempt('hash-a')).rejects.toMatchObject({
      statusCode: 429,
      message: expect.stringContaining('2 analyses per hour'),
    });
  });

  it('refuses with 429 and a busy message when everybody together is over the limit', async () => {
    repository.tryReserveAttempt.mockResolvedValue('global-limit');

    await expect(reserveAttempt('hash-a')).rejects.toMatchObject({
      statusCode: 429,
      message: expect.stringContaining('busy'),
    });
  });

  it('lets the error of a failing database through instead of allowing the attempt', async () => {
    repository.tryReserveAttempt.mockRejectedValue(new Error('database down'));

    await expect(reserveAttempt('hash-a')).rejects.toThrow('database down');
  });
});
