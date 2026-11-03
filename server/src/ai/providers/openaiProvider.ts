import { env } from '../../config/env';
import { AppError } from '../../middleware/errorHandler';
import type { AIProvider, AnalyzeInput } from '../AIProvider';
import { parseReport } from '../parseReport';
import { buildUserPrompt, SYSTEM_PROMPT } from '../prompt';
import type { AIReport } from '../schema';

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const OPENAI_TEMPERATURE = 0.2;
/* A stalled model call would hold the request until the platform kills it; fail fast instead. */
const OPENAI_TIMEOUT_MS = 20_000;

/**
 * Talks to the OpenAI Chat Completions API using the built-in `fetch` (no SDK
 * dependency). `response_format: json_object` asks the model to reply with
 * strict JSON.
 */
export class OpenAIProvider implements AIProvider {
  readonly name = 'openai';

  async analyze(input: AnalyzeInput): Promise<AIReport> {
    const res = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify(buildRequestBody(input)),
      signal: AbortSignal.timeout(OPENAI_TIMEOUT_MS),
    }).catch((error: unknown) => {
      if (error instanceof Error && error.name === 'TimeoutError') {
        throw new AppError(504, 'The AI service did not answer in time. Try again.');
      }
      throw error;
    });

    if (!res.ok) {
      throw new AppError(502, `OpenAI request failed (${res.status}).`);
    }

    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    return parseReport(data.choices?.[0]?.message?.content ?? '');
  }
}

function buildRequestBody(input: AnalyzeInput) {
  return {
    model: env.OPENAI_MODEL,
    temperature: OPENAI_TEMPERATURE,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: buildUserPrompt(input) },
    ],
  };
}
