import { AppError } from '../middleware/errorHandler';
import { aiReportSchema, type AIReport } from './schema';

/**
 * Turn the model's raw text answer into a validated AIReport.
 *
 * Models sometimes wrap JSON in ```json fences even when told not to, so we
 * strip those first. Then we JSON.parse and validate with Zod. Any failure
 * becomes a clear 502 — the AI misbehaved, not the user.
 */
export function parseReport(content: string): AIReport {
  const cleaned = content
    .trim()
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/, '')
    .trim();

  let json: unknown;
  try {
    json = JSON.parse(cleaned);
  } catch {
    throw new AppError(502, 'The AI returned a response that was not valid JSON.');
  }

  const result = aiReportSchema.safeParse(json);
  if (!result.success) {
    throw new AppError(502, 'The AI response did not match the expected report format.');
  }
  return result.data;
}
