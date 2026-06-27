import { env } from '../../config/env';
import { AppError } from '../../middleware/errorHandler';
import type { AIProvider, AnalyzeInput } from '../AIProvider';
import { parseReport } from '../parseReport';
import { buildUserPrompt, SYSTEM_PROMPT } from '../prompt';
import type { AIReport } from '../schema';

/**
 * Talks to the OpenAI Chat Completions API using the built-in `fetch` (no SDK
 * dependency). `response_format: json_object` asks the model to reply with
 * strict JSON.
 */
export class OpenAIProvider implements AIProvider {
  readonly name = 'openai';

  async analyze(input: AnalyzeInput): Promise<AIReport> {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: env.OPENAI_MODEL,
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: buildUserPrompt(input) },
        ],
      }),
    });

    if (!res.ok) {
      throw new AppError(502, `OpenAI request failed (${res.status}).`);
    }

    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const content = data.choices?.[0]?.message?.content ?? '';
    return parseReport(content);
  }
}
