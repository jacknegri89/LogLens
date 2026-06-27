import { env } from '../../config/env';
import { AppError } from '../../middleware/errorHandler';
import type { AIProvider, AnalyzeInput } from '../AIProvider';
import { parseReport } from '../parseReport';
import { buildUserPrompt, SYSTEM_PROMPT } from '../prompt';
import type { AIReport } from '../schema';

/**
 * Talks to a local Ollama server (https://ollama.com). Free and offline.
 * `format: 'json'` makes Ollama constrain the output to valid JSON, and
 * `stream: false` gives us the whole answer in one response.
 */
export class OllamaProvider implements AIProvider {
  readonly name = 'ollama';

  async analyze(input: AnalyzeInput): Promise<AIReport> {
    let res: Response;
    try {
      res = await fetch(`${env.OLLAMA_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: env.OLLAMA_MODEL,
          format: 'json',
          stream: false,
          options: { temperature: 0.2 },
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: buildUserPrompt(input) },
          ],
        }),
      });
    } catch {
      throw new AppError(502, `Could not reach Ollama at ${env.OLLAMA_BASE_URL}. Is it running?`);
    }

    if (!res.ok) {
      throw new AppError(
        502,
        `Ollama request failed (${res.status}). Is the model "${env.OLLAMA_MODEL}" pulled?`,
      );
    }

    const data = (await res.json()) as { message?: { content?: string } };
    const content = data.message?.content ?? '';
    return parseReport(content);
  }
}
