import { env } from '../../config/env';
import { AppError } from '../../middleware/errorHandler';
import type { AIProvider, AnalyzeInput } from '../AIProvider';
import { parseReport } from '../parseReport';
import { buildUserPrompt, SYSTEM_PROMPT } from '../prompt';
import type { AIReport } from '../schema';

const OLLAMA_TEMPERATURE = 0.2;

/**
 * Talks to a local Ollama server (https://ollama.com). Free and offline.
 * `format: 'json'` makes Ollama constrain the output to valid JSON, and
 * `stream: false` gives us the whole answer in one response.
 */
export class OllamaProvider implements AIProvider {
  readonly name = 'ollama';

  async analyze(input: AnalyzeInput): Promise<AIReport> {
    const res = await postChat(input);
    const data = (await res.json()) as { message?: { content?: string } };
    return parseReport(data.message?.content ?? '');
  }
}

function buildRequestBody(input: AnalyzeInput) {
  return {
    model: env.OLLAMA_MODEL,
    format: 'json',
    stream: false,
    options: { temperature: OLLAMA_TEMPERATURE },
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: buildUserPrompt(input) },
    ],
  };
}

async function postChat(input: AnalyzeInput): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(`${env.OLLAMA_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildRequestBody(input)),
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
  return res;
}
