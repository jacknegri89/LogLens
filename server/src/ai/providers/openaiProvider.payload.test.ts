import { afterEach, expect, it, vi } from 'vitest';

import { analyzeStructure } from '../../analysis/analyzeStructure';
import type { AnalyzeInput } from '../AIProvider';
import { buildStructuredContext } from '../structuredContext';
import { OllamaProvider } from './ollamaProvider';
import { OpenAIProvider } from './openaiProvider';

// Made-up secrets. The test reads the request body right before it would be sent: no real call.
const SESSION = 'sess_FAKE_ABCDEF0123456789';
const DB_PASSWORD = 'dbPassFAKE99';
const API_KEY = 'sk-FAKEFAKEFAKEFAKEFAKE1234567890';
const LATE_PASSWORD = 'lateFAKEpw77';

const LOG = [
  `2026-11-04T10:00:00Z INFO [auth] login ok requestId=req-1 sessionId=${SESSION}`,
  `2026-11-04T10:00:01Z ERROR [db://svc:${DB_PASSWORD}@db.internal] connection refused requestId=req-1 sessionId=${SESSION} api_key=${API_KEY}`,
].join('\n');

afterEach(() => {
  vi.unstubAllGlobals();
});

/** Runs the provider against a fake network and returns the exact bytes it tried to send. */
async function sentBody(
  provider: OpenAIProvider | OllamaProvider,
  input: AnalyzeInput,
): Promise<string> {
  const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 500 }));
  vi.stubGlobal('fetch', fetchMock);
  await provider.analyze(input).catch(() => undefined);
  expect(fetchMock).toHaveBeenCalledOnce();
  return (fetchMock.mock.calls[0]?.[1] as { body: string }).body;
}

function structuredInput(extraJson = ''): AnalyzeInput {
  const analysis = analyzeStructure(LOG);
  const context = buildStructuredContext(analysis, {
    maxContextChars: 24_000,
    maxContextEvents: 250,
    maxCallsPerAnalysis: 1,
    maxCostUsdPerAnalysis: 0.05,
    inputUsdPerMillionTokens: 0.15,
    outputUsdPerMillionTokens: 0.6,
    timeoutMs: 40_000,
  });
  return {
    excerpt: LOG,
    severityHint: 'high',
    structured: {
      contextJson: context.json + extraJson,
      incidentIds: context.incidentIds,
      omittedEvents: 0,
    },
  };
}

it.each([
  ['OpenAI', () => new OpenAIProvider()],
  ['Ollama', () => new OllamaProvider()],
])('%s: the request body holds no secret from the log', async (_name, create) => {
  const body = await sentBody(create(), structuredInput());

  for (const secret of [SESSION, DB_PASSWORD, API_KEY]) {
    expect(body, `"${secret}" would have been sent`).not.toContain(secret);
  }
});

it.each([
  ['OpenAI', () => new OpenAIProvider()],
  ['Ollama', () => new OllamaProvider()],
])('%s: masks again a secret that a caller forgot to mask', async (_name, create) => {
  const body = await sentBody(create(), structuredInput(` {"note":"password=${LATE_PASSWORD}"}`));

  expect(body).not.toContain(LATE_PASSWORD);
});

it('OpenAI: still sends the pseudonymised context, so the model has something to read', async () => {
  const body = await sentBody(new OpenAIProvider(), structuredInput());

  expect(body).toContain('session-1');
  expect(body).toContain('connection refused');
});
