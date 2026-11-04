import { beforeEach, describe, expect, it, vi } from 'vitest';

import { reserveAttempt } from './attemptLimit';

const { repository } = vi.hoisted(() => ({
  repository: {
    deleteExpiredAttempts: vi.fn(),
    recordAttempt: vi.fn(),
    removeAttempt: vi.fn(),
    countAttemptsInLastHour: vi.fn(),
  },
}));

vi.mock('../repositories/analysisRepository', () => repository);
vi.mock('../config/env', () => ({
  env: { RATE_LIMIT_PER_HOUR: 2, GLOBAL_LIMIT_PER_HOUR: 100 },
}));

describe('reserveAttempt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    repository.deleteExpiredAttempts.mockResolvedValue(0);
    repository.recordAttempt.mockResolvedValue('attempt-1');
  });

  it('removes expired attempts before recording a new one', async () => {
    repository.countAttemptsInLastHour.mockResolvedValue(1);

    await reserveAttempt('hash-a');

    expect(repository.deleteExpiredAttempts).toHaveBeenCalledBefore(repository.recordAttempt);
    expect(repository.removeAttempt).not.toHaveBeenCalled();
  });

  it('removes the refused attempt when the client is over its hourly limit', async () => {
    repository.countAttemptsInLastHour.mockResolvedValueOnce(3).mockResolvedValueOnce(3);

    await expect(reserveAttempt('hash-a')).rejects.toMatchObject({ statusCode: 429 });
    expect(repository.removeAttempt).toHaveBeenCalledWith('attempt-1');
  });
});
