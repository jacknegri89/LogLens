import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ANALYSIS_RETENTION_DAYS, purgeExpiredAnalyses } from './retention';

const { deleteAnalysesOlderThan } = vi.hoisted(() => ({
  deleteAnalysesOlderThan: vi.fn(),
}));

vi.mock('../repositories/analysisRepository', () => ({ deleteAnalysesOlderThan }));

describe('purgeExpiredAnalyses', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    deleteAnalysesOlderThan.mockResolvedValue(3);
  });

  it('deletes analyses older than the retention period', async () => {
    expect(ANALYSIS_RETENTION_DAYS).toBe(90);

    const deleted = await purgeExpiredAnalyses();

    expect(deleteAnalysesOlderThan).toHaveBeenCalledWith(90);
    expect(deleted).toBe(3);
  });
});
