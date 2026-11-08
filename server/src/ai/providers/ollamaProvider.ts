import { z } from 'zod';

import { env } from '../../config/env';
import { AppError } from '../../middleware/errorHandler';
import type { AIProvider, AnalyzeInput } from '../AIProvider';
import { guardReport } from '../guardReport';
import { parseReport } from '../parseReport';
import { buildSystemPrompt, buildUserPrompt } from '../prompt';
import { readJsonResponse } from '../readJsonResponse';
import type { AIReport } from '../schema';

const OLLAMA_TEMPERATURE = 0.2;
const OLLAMA_TIMEOUT_MS = 60_000;
const OLLAMA_ENVELOPE = z.object({ message: z.object({ content: z.string() }) });

/**
 * Talks to a local Ollama server (https://ollama.com). Free and offline.
 * `format: 'json'` makes Ollama constrain the output to valid JSON, and
 * `stream: false` gives us the whole answer in one response.
 */
export class OllamaProvider implements AIProvider {
  readonly name = 'ollama';

  async analyze(input: AnalyzeInput): Promise<AIReport> {
    const response = await postChat(input);
    let data: unknown;
    try {
      data = await readJsonResponse(response);
    } catch (error) {
      if (error instanceof Error && error.name === 'TimeoutError') {
        throw new AppError(504, 'Ollama did not answer in time. Try again.');
      }
      throw error;
    }
    const parsed = OLLAMA_ENVELOPE.safeParse(data);
    if (!parsed.success) {
      throw new AppError(502, 'The AI service returned an invalid response.');
    }
    return guardReport(parseReport(parsed.data.message.content), input);
  }
}

function buildRequestBody(input: AnalyzeInput) {
  return {
    model: env.OLLAMA_MODEL,
    format: 'json',
    stream: false,
    options: { temperature: OLLAMA_TEMPERATURE },
    messages: [
      {
        role: 'system',
        content: buildSystemPrompt(input.language, input.structured !== undefined),
      },
      { role: 'user', content: buildUserPrompt(input) },
    ],
  };
}

async function postChat(input: AnalyzeInput): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(`${env.OLLAMA_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildRequestBody(input)),
      signal: AbortSignal.timeout(OLLAMA_TIMEOUT_MS),
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'TimeoutError') {
      throw new AppError(504, 'Ollama did not answer in time. Try again.');
    }
    throw new AppError(502, 'Could not reach Ollama. Is it running?');
  }

  if (!response.ok) {
    void response.body?.cancel().catch(() => undefined);
    throw new AppError(
      502,
      `Ollama request failed (${response.status}). Is the model "${env.OLLAMA_MODEL}" pulled?`,
    );
  }
  return response;
}
