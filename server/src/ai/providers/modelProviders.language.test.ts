import { afterEach, describe, expect, it, vi } from 'vitest';

import type { AIProvider, AnalyzeInput } from '../AIProvider';
import type { AIReport } from '../schema';
import { HybridProvider } from './hybridProvider';
import { OllamaProvider } from './ollamaProvider';
import { OpenAIProvider } from './openaiProvider';
import { RulesProvider } from './rulesProvider';

const MODEL_ANSWER = JSON.stringify({
  title: 'Payment rejected',
  severity: 'medium',
  category: 'Payments',
  keyLines: ['ERROR payments: charge rejected'],
  causes: ['The card was declined.'],
  debugSteps: ['Ask the user for another card.'],
  bugReportMarkdown: '## Payment rejected\n\n**Severity:** medium',
});
const EXCERPT = 'ERROR payments: charge rejected';

interface ChatMessage {
  role: string;
  content: string;
}

/** Replaces `fetch` and returns the messages that the provider sent to the model. */
function fakeModelServer(body: unknown): () => ChatMessage[] {
  const fetchMock = vi.fn().mockResolvedValue(Response.json(body));
  vi.stubGlobal('fetch', fetchMock);
  return () => {
    const init = fetchMock.mock.calls[0]?.[1] as { body: string };
    return (JSON.parse(init.body) as { messages: ChatMessage[] }).messages;
  };
}

function textOf(messages: ChatMessage[]): string {
  return messages.map((message) => message.content).join('\n');
}

afterEach(() => {
  vi.unstubAllGlobals();
});

it('returns a timeout error when Ollama does not respond', async () => {
  const fetchMock = vi.fn().mockRejectedValue(new DOMException('Timed out', 'TimeoutError'));
  vi.stubGlobal('fetch', fetchMock);

  await expect(
    new OllamaProvider().analyze({ excerpt: EXCERPT, severityHint: 'low' }),
  ).rejects.toMatchObject({ statusCode: 504 });
  expect(fetchMock.mock.calls[0]?.[1].signal).toBeInstanceOf(AbortSignal);
});

it.each([
  ['Ollama', () => new OllamaProvider()],
  ['OpenAI', () => new OpenAIProvider()],
])('returns 504 when the %s response body times out', async (_name, createProvider) => {
  const response = new Response(
    new ReadableStream({
      start(controller) {
        controller.error(new DOMException('Timed out', 'TimeoutError'));
      },
    }),
  );
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response));

  await expect(
    createProvider().analyze({ excerpt: EXCERPT, severityHint: 'low' }),
  ).rejects.toMatchObject({
    statusCode: 504,
  });
});

describe.each([
  ['Ollama', () => new OllamaProvider(), { message: { content: 123 } }],
  ['OpenAI', () => new OpenAIProvider(), { choices: [{ message: { content: 123 } }] }],
])('%s response validation', (_name, createProvider, malformed) => {
  it.each([null, malformed])('rejects an invalid response envelope', async (body) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(body)));
    await expect(
      createProvider().analyze({ excerpt: EXCERPT, severityHint: 'low' }),
    ).rejects.toMatchObject({
      statusCode: 502,
    });
  });

  it('cancels an unsuccessful response body', async () => {
    const cancel = vi.fn();
    const stream = new ReadableStream({ cancel });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(stream, { status: 500 })));
    await expect(
      createProvider().analyze({ excerpt: EXCERPT, severityHint: 'low' }),
    ).rejects.toMatchObject({
      statusCode: 502,
    });
    expect(cancel).toHaveBeenCalledOnce();
  });
});

describe.each([
  ['OpenAI', () => new OpenAIProvider(), { choices: [{ message: { content: MODEL_ANSWER } }] }],
  ['Ollama', () => new OllamaProvider(), { message: { content: MODEL_ANSWER } }],
])('%s provider language', (_name, createProvider, answer) => {
  it('asks the model for Italian text and Italian headings when the language is Italian', async () => {
    const sentMessages = fakeModelServer(answer);

    await createProvider().analyze({ excerpt: EXCERPT, severityHint: 'low', language: 'it' });

    const prompt = textOf(sentMessages());
    expect(prompt).toContain('Write every human-readable value in Italian.');
    expect(prompt).toContain('Write every human-readable field of the report in Italian.');
    expect(prompt).not.toContain('## 🚨 SECURITY INCIDENTS DETECTED');
  });

  it('asks the model for English when the language is English or missing', async () => {
    for (const language of ['en', undefined] as const) {
      const sentMessages = fakeModelServer(answer);

      await createProvider().analyze({ excerpt: EXCERPT, severityHint: 'low', language });

      const prompt = textOf(sentMessages());
      expect(prompt).toContain('Write every human-readable value in English.');
      expect(prompt).toContain('## 🚨 SECURITY INCIDENTS DETECTED');
    }
  });

  it('keeps the log between boundary lines in Italian too', async () => {
    const sentMessages = fakeModelServer(answer);

    await createProvider().analyze({ excerpt: EXCERPT, severityHint: 'low', language: 'it' });

    const user = sentMessages().find((message) => message.role === 'user')?.content ?? '';
    const boundary = user.match(/^BEGIN (LOG-[0-9a-f]+)$/m)?.[1] ?? '';
    expect(user).toContain(`BEGIN ${boundary}\n${EXCERPT}\nEND ${boundary}`);
  });

  it('fixes the severity line of an issue written with English headings', async () => {
    fakeModelServer(answer);

    const report = await createProvider().analyze({
      excerpt: 'ERROR payments: charge rejected; sqlmap probe',
      severityHint: 'low',
      language: 'en',
    });

    expect(report.bugReportMarkdown).toContain('**Severity:** high');
  });
});

describe('HybridProvider language', () => {
  class RecordingProvider implements AIProvider {
    readonly name = 'recording';
    inputs: AnalyzeInput[] = [];

    analyze(input: AnalyzeInput): Promise<AIReport> {
      this.inputs.push(input);
      return Promise.resolve({
        title: 'recorded',
        severity: 'low',
        category: 'Test',
        keyLines: [],
        causes: [],
        debugSteps: [],
        bugReportMarkdown: '## recorded',
      });
    }
  }

  it('passes the language to the model for a log that no rule covers', async () => {
    const model = new RecordingProvider();

    await new HybridProvider(new RulesProvider(), model).analyze({
      excerpt: EXCERPT,
      severityHint: 'high',
      language: 'it',
    });

    expect(model.inputs).toHaveLength(1);
    expect(model.inputs[0]?.language).toBe('it');
  });

  it('passes the language to the rules for a log that a rule explains', async () => {
    const model = new RecordingProvider();

    const report = await new HybridProvider(new RulesProvider(), model).analyze({
      excerpt: 'ECONNREFUSED 172.18.0.2:5432',
      severityHint: 'low',
      language: 'it',
    });

    expect(model.inputs).toHaveLength(0);
    expect(report.bugReportMarkdown).toContain('### Cause probabili');
  });
});
