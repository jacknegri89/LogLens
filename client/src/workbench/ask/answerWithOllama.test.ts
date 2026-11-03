import { describe, expect, it } from 'vitest';

import type { AnalysisRecord } from '../../lib/types';
import { OllamaError } from '../engine/ollamaClient';
import { answerWithOllama, failureChange, type ChatHandle } from './answerWithOllama';
import { addMessage, appendToken, patchMessage, type ChatMessage } from './chatMessages';

const RECORD = {
  id: 'a1',
  title: 'Database down',
  severity: 'high',
  category: 'Database',
  report: { keyLines: ['ERROR x'], causes: ['c'], debugSteps: ['s'] },
} as unknown as AnalysisRecord;

function fakeChat() {
  const state = { messages: [] as ChatMessage[], nextId: 1 };
  const chat: ChatHandle = {
    add: (draft) => {
      const id = state.nextId++;
      state.messages = addMessage(state.messages, { ...draft, id });
      return id;
    },
    append: (id, token) => {
      state.messages = appendToken(state.messages, id, token);
    },
    patch: (id, change) => {
      state.messages = patchMessage(state.messages, id, change);
    },
  };
  return { chat, state };
}

const line = (text: string, done = false) =>
  JSON.stringify({ message: { content: text }, done }) + '\n';

function request(fetchImpl: typeof fetch, signal = new AbortController().signal) {
  return {
    baseUrl: 'http://localhost:11434',
    model: 'llama3.2:3b',
    record: RECORD,
    question: 'What failed first?',
    language: 'en' as const,
    signal,
    fetchImpl,
  };
}

describe('failureChange', () => {
  it('marks an abort as stopped', () => {
    expect(failureChange(new DOMException('Aborted', 'AbortError'))).toEqual({ status: 'stopped' });
  });

  it('keeps the reason of an Ollama failure', () => {
    expect(failureChange(new OllamaError('unreachable', 'down'))).toEqual({
      status: 'failed',
      failure: 'unreachable',
    });
  });

  it('treats any other error as a stream failure', () => {
    expect(failureChange(new Error('boom'))).toEqual({ status: 'failed', failure: 'stream' });
  });
});

describe('answerWithOllama', () => {
  it('writes the streamed text into one assistant message and marks it done', async () => {
    const { chat, state } = fakeChat();
    const fetchImpl = (async () =>
      new Response(line('The ') + line('database') + line('', true))) as unknown as typeof fetch;
    await answerWithOllama(chat, request(fetchImpl));
    expect(state.messages).toHaveLength(1);
    expect(state.messages[0]).toMatchObject({
      role: 'assistant',
      text: 'The database',
      engine: 'ollama',
      model: 'llama3.2:3b',
      status: 'done',
    });
  });

  it('sends only the summary: the model, the stream flag and no raw log', async () => {
    const { chat } = fakeChat();
    let body = '';
    const fetchImpl = (async (_url: string, init: RequestInit) => {
      body = String(init.body);
      return new Response(line('', true));
    }) as unknown as typeof fetch;
    await answerWithOllama(chat, request(fetchImpl));
    const sent = JSON.parse(body);
    expect(sent.stream).toBe(true);
    expect(sent.messages[1].content).toContain('Title: Database down');
    expect(sent.messages[1].content).toContain('Question: What failed first?');
  });

  it('marks the message as failed when the server cannot be reached', async () => {
    const { chat, state } = fakeChat();
    const fetchImpl = (async () => {
      throw new TypeError('Failed to fetch');
    }) as unknown as typeof fetch;
    await answerWithOllama(chat, request(fetchImpl));
    expect(state.messages[0]).toMatchObject({ status: 'failed', failure: 'unreachable', text: '' });
  });

  it('keeps the text written so far when the model reports an error', async () => {
    const { chat, state } = fakeChat();
    const fetchImpl = (async () =>
      new Response(line('Part') + '{"error":"out of memory"}\n')) as unknown as typeof fetch;
    await answerWithOllama(chat, request(fetchImpl));
    expect(state.messages[0]).toMatchObject({ status: 'failed', failure: 'stream', text: 'Part' });
  });

  it('marks the message as stopped when the visitor aborts', async () => {
    const { chat, state } = fakeChat();
    const controller = new AbortController();
    const fetchImpl = (async (_url: string, init: RequestInit) => {
      controller.abort();
      init.signal?.throwIfAborted();
      return new Response('');
    }) as unknown as typeof fetch;
    await answerWithOllama(chat, request(fetchImpl, controller.signal));
    expect(state.messages[0].status).toBe('stopped');
  });
});
