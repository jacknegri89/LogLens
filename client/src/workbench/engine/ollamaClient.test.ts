import { describe, expect, it, vi } from 'vitest';

import {
  fetchModels,
  normalizeBaseUrl,
  OllamaError,
  parseModelNames,
  readTokens,
  streamChat,
} from './ollamaClient';

const encoder = new TextEncoder();

function streamOf(...chunks: (string | Uint8Array)[]): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        if (typeof chunk === 'string') {
          controller.enqueue(encoder.encode(chunk));
        } else {
          controller.enqueue(chunk);
        }
      }
      controller.close();
    },
  });
}

async function collect(generator: AsyncGenerator<string>): Promise<string[]> {
  const pieces: string[] = [];
  for await (const piece of generator) pieces.push(piece);
  return pieces;
}

const line = (text: string, done = false) =>
  JSON.stringify({ message: { content: text }, done }) + '\n';

describe('normalizeBaseUrl', () => {
  it.each([
    ['http://localhost:11434', 'http://localhost:11434'],
    ['  http://localhost:11434/  ', 'http://localhost:11434'],
    ['localhost:11434', 'http://localhost:11434'],
    ['http://127.0.0.1:11434/api/chat?x=1', 'http://127.0.0.1:11434'],
    ['https://ollama.example.com', 'https://ollama.example.com'],
  ])('turns %j into %j', (input, expected) => {
    expect(normalizeBaseUrl(input)).toBe(expected);
  });

  it.each([
    '',
    '   ',
    'javascript:alert(1)',
    'file:///etc/passwd',
    'ftp://host',
    'http://user:pw@host',
    'http://',
  ])('refuses %j', (input) => {
    expect(normalizeBaseUrl(input)).toBeNull();
  });
});

describe('parseModelNames', () => {
  it('lists the model names without duplicates', () => {
    const data = {
      models: [{ name: 'llama3.2:3b' }, { name: 'qwen2.5:7b' }, { name: 'llama3.2:3b' }],
    };
    expect(parseModelNames(data)).toEqual(['llama3.2:3b', 'qwen2.5:7b']);
  });

  it.each([
    null,
    undefined,
    'text',
    {},
    { models: 'x' },
    { models: [null, {}, { name: 5 }, { name: ' ' }] },
  ])('returns an empty list for %j', (data) => {
    expect(parseModelNames(data)).toEqual([]);
  });
});

describe('fetchModels', () => {
  it('reads the models from /api/tags', async () => {
    let requested = '';
    const fakeFetch = (async (url: string) => {
      requested = url;
      return Response.json({ models: [{ name: 'llama3.2:3b' }] });
    }) as unknown as typeof fetch;
    await expect(fetchModels('http://localhost:11434', undefined, fakeFetch)).resolves.toEqual([
      'llama3.2:3b',
    ]);
    expect(requested).toBe('http://localhost:11434/api/tags');
  });

  it('reports an unreachable server', async () => {
    const down = (async () => {
      throw new TypeError('Failed to fetch');
    }) as unknown as typeof fetch;
    await expect(fetchModels('http://localhost:1', undefined, down)).rejects.toMatchObject({
      reason: 'unreachable',
    });
  });

  it('reports an HTTP error and an unreadable body', async () => {
    const notFound = (async () => new Response('', { status: 404 })) as unknown as typeof fetch;
    await expect(fetchModels('http://x', undefined, notFound)).rejects.toMatchObject({
      reason: 'http',
    });
    const broken = (async () => new Response('not json')) as unknown as typeof fetch;
    await expect(fetchModels('http://x', undefined, broken)).rejects.toMatchObject({
      reason: 'badResponse',
    });
  });

  it('lets an abort through unchanged', async () => {
    const aborted = (async () => {
      throw new DOMException('Aborted', 'AbortError');
    }) as unknown as typeof fetch;
    await expect(fetchModels('http://x', undefined, aborted)).rejects.toMatchObject({
      name: 'AbortError',
    });
  });
});

describe('readTokens', () => {
  it('rejects an oversized response and cancels the stream', async () => {
    let cancelled = false;
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(2 * 1024 * 1024 + 1));
      },
      cancel() {
        cancelled = true;
      },
    });
    await expect(collect(readTokens(body))).rejects.toMatchObject({ reason: 'stream' });
    expect(cancelled).toBe(true);
  });
  it('yields the text of each line as it arrives', async () => {
    const body = streamOf(line('Hel'), line('lo'), line('', true));
    await expect(collect(readTokens(body))).resolves.toEqual(['Hel', 'lo']);
  });

  it('joins a line and a character that are split across chunks', async () => {
    const bytes = encoder.encode(line('è caduta'));
    const middle = bytes.indexOf(0xc3) + 1;
    const body = streamOf(bytes.slice(0, middle), bytes.slice(middle));
    await expect(collect(readTokens(body))).resolves.toEqual(['è caduta']);
  });

  it('stops at the done line and ignores what follows', async () => {
    const body = streamOf(line('a', true) + line('late'));
    await expect(collect(readTokens(body))).resolves.toEqual(['a']);
  });

  it('throws the message of an error line', async () => {
    const body = streamOf(line('partial'), '{"error":"model requires more memory"}\n');
    const pieces: string[] = [];
    await expect(
      (async () => {
        for await (const piece of readTokens(body)) pieces.push(piece);
      })(),
    ).rejects.toThrow('model requires more memory');
    expect(pieces).toEqual(['partial']);
  });
});

describe('streamChat', () => {
  const messages = [{ role: 'user' as const, content: 'hi' }];

  it('aborts a request that exceeds its time limit', async () => {
    vi.useFakeTimers();
    try {
      const stalled = ((_url: string, init: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init.signal?.addEventListener('abort', () =>
            reject(new DOMException('Aborted', 'AbortError')),
          );
        })) as typeof fetch;
      const result = collect(
        streamChat({ baseUrl: 'http://x', model: 'm', messages, fetchImpl: stalled }),
      );
      const assertion = expect(result).rejects.toMatchObject({ reason: 'stream' });
      await vi.advanceTimersByTimeAsync(180_000);
      await assertion;
    } finally {
      vi.useRealTimers();
    }
  });

  it('posts the model and messages with stream enabled and yields the answer', async () => {
    let seen: { url: string; init: RequestInit } | null = null;
    const fakeFetch = (async (url: string, init: RequestInit) => {
      seen = { url, init };
      return new Response(streamOf(line('ok'), line('', true)));
    }) as unknown as typeof fetch;
    const pieces = await collect(
      streamChat({
        baseUrl: 'http://localhost:11434',
        model: 'llama3.2:3b',
        messages,
        fetchImpl: fakeFetch,
      }),
    );
    expect(pieces).toEqual(['ok']);
    expect(seen).not.toBeNull();
    const { url, init } = seen as unknown as { url: string; init: RequestInit };
    expect(url).toBe('http://localhost:11434/api/chat');
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toEqual({ model: 'llama3.2:3b', messages, stream: true });
  });

  it('fails with an http error when the server refuses', async () => {
    const refusing = (async () => new Response('', { status: 404 })) as unknown as typeof fetch;
    const run = collect(
      streamChat({ baseUrl: 'http://x', model: 'm', messages, fetchImpl: refusing }),
    );
    await expect(run).rejects.toBeInstanceOf(OllamaError);
    await expect(
      collect(streamChat({ baseUrl: 'http://x', model: 'm', messages, fetchImpl: refusing })),
    ).rejects.toMatchObject({ reason: 'http' });
  });

  it('fails with unreachable when the request cannot be sent', async () => {
    const down = (async () => {
      throw new TypeError('Failed to fetch');
    }) as unknown as typeof fetch;
    await expect(
      collect(streamChat({ baseUrl: 'http://x', model: 'm', messages, fetchImpl: down })),
    ).rejects.toMatchObject({ reason: 'unreachable' });
  });
});
