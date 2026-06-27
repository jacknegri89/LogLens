import { getAIProvider } from '../ai';
import type { AIReport } from '../ai/schema';
import { AppError } from '../middleware/errorHandler';
import { parseLog } from '../parser/logParser';

export interface AnalyzeOutcome {
  report: AIReport;
  meta: {
    provider: string;
    totalLines: number;
    matchedCount: number;
    truncated: boolean;
  };
}

/**
 * The core use-case of LogLens: raw log -> parsed excerpt -> AI -> validated
 * report. There is no database here on purpose; persistence is wired in the
 * API layer (Phase 5), which keeps this function easy to test.
 */
export async function analyzeLog(rawLog: string): Promise<AnalyzeOutcome> {
  if (rawLog.trim() === '') {
    throw new AppError(400, 'Log text is empty.');
  }

  const parsed = parseLog(rawLog);
  const provider = getAIProvider();
  const report = await provider.analyze({
    excerpt: parsed.excerpt,
    severityHint: parsed.severityHint,
  });

  return {
    report,
    meta: {
      provider: provider.name,
      totalLines: parsed.totalLines,
      matchedCount: parsed.matchedCount,
      truncated: parsed.truncated,
    },
  };
}
