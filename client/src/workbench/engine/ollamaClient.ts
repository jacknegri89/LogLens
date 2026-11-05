import { createNdjsonParser, type StreamEvent } from './ndjson';
import type { OllamaMessage } from './prompt';

export const DEFAULT_OLLAMA_URL = 'http://localhost:11434';

const MAX_MODELS = 200;
const MAX_STREAM_BYTES = 2 * 1024 * 1024;
const CHAT_TIMEOUT_MS = 180_000;

/** Why a call to the local Ollama server did not give an answer. */
export type OllamaFailure = 'invalidUrl' | 'unreachable' | 'badResponse' | 'http' | 'stream';

export class OllamaError extends Error {
  readonly reason: OllamaFailure;

  constructor(reason: OllamaFailure, message: string) {
    super(message);
    this.name = 'OllamaError';
    this.reason = reason;
  }
}

/** The origin of an http(s) address, or null for anything else (other schemes, logins, empty text). */
export function normalizeBaseUrl(input: string): string | null {
  const trimmed = input.trim();
  if (trimmed === '') {
    return null;
  }
  let withScheme = trimmed;
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) {
    withScheme = 'http://' + trimmed;
  }
  try {
    const url = new URL(withScheme);
    const isHttp = url.protocol === 'http:' || url.protocol === 'https:';
    if (isHttp && !url.username && !url.password) {
      return url.origin;
    }
    return null;
  } catch {
    return null;
  }
}

/** The model names of an /api/tags answer; entries without a name are skipped. */
export function parseModelNames(data: unknown): string[] {
  const models = (data as { models?: unknown } | null)?.models;
  if (!Array.isArray(models)) {
    return [];
  }
  const names = models
    .map((entry) => (entry as { name?: unknown } | null)?.name)
    .filter((name): name is string => typeof name === 'string' && name.trim() !== '');
  return [...new Set(names)].slice(0, MAX_MODELS);
}

function isAbort(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

async function request(fetchImpl: typeof fetch, url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetchImpl(url, init);
  } catch (error) {
    if (isAbort(error)) {
      throw error;
    }
    throw new OllamaError('unreachable', 'The Ollama server did not answer');
  }
}

/** The models installed on the local server (GET /api/tags). */
export async function fetchModels(
  baseUrl: string,
  signal?: AbortSignal,
  fetchImpl: typeof fetch = fetch,
): Promise<string[]> {
  const response = await request(fetchImpl, baseUrl + '/api/tags', { signal });
  if (!response.ok) {
    throw new OllamaError('http', 'Ollama answered ' + response.status);
  }
  try {
    return parseModelNames(await response.json());
  } catch {
    throw new OllamaError('badResponse', 'Ollama sent an unreadable list of models');
  }
}

interface ReadEvents {
  tokens: string[];
  finished: boolean;
  failure: OllamaError | null;
}

/** The tokens up to the first "done" or error line; anything after it is ignored. */
function readEvents(events: StreamEvent[]): ReadEvents {
  const tokens: string[] = [];
  for (const event of events) {
    if (event.type === 'error') {
      return { tokens, finished: true, failure: new OllamaError('stream', event.message) };
    }
    if (event.type === 'done') {
      return { tokens, finished: true, failure: null };
    }
    tokens.push(event.text);
  }
  return { tokens, finished: false, failure: null };
}

/** Yields the answer text piece by piece while the response body is still arriving. */
export async function* readTokens(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  const parser = createNdjsonParser();
  let receivedBytes = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (value) {
        receivedBytes += value.byteLength;
      }
      if (receivedBytes > MAX_STREAM_BYTES) {
        throw new OllamaError('stream', 'The Ollama response exceeded the size limit');
      }
      let events: StreamEvent[];
      if (done) {
        events = parser.flush();
      } else {
        events = parser.push(decoder.decode(value, { stream: true }));
      }
      const { tokens, finished, failure } = readEvents(events);
      yield* tokens;
      if (failure) {
        throw failure;
      }
      if (done || finished) {
        return;
      }
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }
}

export interface ChatRequest {
  baseUrl: string;
  model: string;
  messages: OllamaMessage[];
  signal?: AbortSignal;
  fetchImpl?: typeof fetch;
}

/** POST /api/chat with `stream: true`; yields the text of the answer as it is generated. */
export async function* streamChat(options: ChatRequest): AsyncGenerator<string> {
  const { baseUrl, model, messages, signal, fetchImpl = fetch } = options;
  const controller = new AbortController();
  let timedOut = false;
  const cancel = () => controller.abort();
  if (signal?.aborted) {
    cancel();
  } else {
    signal?.addEventListener('abort', cancel, { once: true });
  }
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, CHAT_TIMEOUT_MS);
  try {
    const response = await request(fetchImpl, baseUrl + '/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages, stream: true }),
      signal: controller.signal,
    });
    if (!response.ok || !response.body) {
      throw new OllamaError('http', 'Ollama answered ' + response.status);
    }
    yield* readTokens(response.body);
  } catch (error) {
    if (timedOut) {
      throw new OllamaError('stream', 'The Ollama response took too long');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', cancel);
  }
}
