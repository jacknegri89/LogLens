import { z } from 'zod';

import { env } from '../../config/env';
import { AppError } from '../../middleware/errorHandler';
import type { AIProvider, AnalyzeInput } from '../AIProvider';
import { MAX_OUTPUT_TOKENS } from '../aiBudget';
import { maskInputForModel } from '../maskInput';
import { guardReport } from '../guardReport';
import { parseReport } from '../parseReport';
import { buildSystemPrompt, buildUserPrompt } from '../prompt';
import { readJsonResponse } from '../readJsonResponse';
import type { AIReport } from '../schema';

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const OPENAI_TEMPERATURE = 0.2;
const OPENAI_ENVELOPE = z.object({
  choices: z.array(z.object({ message: z.object({ content: z.string() }) })).min(1),
});

/**
 * Talks to the OpenAI Chat Completions API using the built-in `fetch` (no SDK
 * dependency). `response_format: json_object` asks the model to reply with
 * strict JSON.
 */
export class OpenAIProvider implements AIProvider {
  readonly name = 'openai';

  async analyze(rawInput: AnalyzeInput): Promise<AIReport> {
    // The log leaves the server here: tokens, passwords and keys are hidden before it does.
    const input = maskInputForModel(rawInput);
    const response = await postChatCompletion(input);

    if (!response.ok) {
      void response.body?.cancel().catch(() => undefined);
      throw new AppError(502, `OpenAI request failed (${response.status}).`);
    }

    let data: unknown;
    try {
      data = await readJsonResponse(response);
    } catch (error) {
      rethrowTimeout(error);
    }
    const parsed = OPENAI_ENVELOPE.safeParse(data);
    if (!parsed.success) {
      throw new AppError(502, 'The AI service returned an invalid response.');
    }
    return guardReport(parseReport(parsed.data.choices[0].message.content), input);
  }
}

function postChatCompletion(input: AnalyzeInput): Promise<Response> {
  return fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify(buildRequestBody(input)),
    // A stalled model call would hold the request until the platform kills it; fail fast instead.
    signal: AbortSignal.timeout(env.AI_TIMEOUT_MS),
  }).catch(rethrowTimeout);
}

function rethrowTimeout(error: unknown): never {
  if (error instanceof Error && error.name === 'TimeoutError') {
    throw new AppError(504, 'The AI service did not answer in time. Try again.');
  }
  throw error;
}

function buildRequestBody(input: AnalyzeInput) {
  return {
    model: env.OPENAI_MODEL,
    temperature: OPENAI_TEMPERATURE,
    max_tokens: MAX_OUTPUT_TOKENS,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: buildSystemPrompt(input.language, input.structured !== undefined),
      },
      { role: 'user', content: buildUserPrompt(input) },
    ],
  };
}
