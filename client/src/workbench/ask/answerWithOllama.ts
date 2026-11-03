import { OllamaError } from '../engine/ollamaClient';
import { runOllamaAnswer, type OllamaAnswerRequest } from '../engine/runOllamaAnswer';
import type { ChatMessage } from './chatMessages';

/** The part of the chat state that an answer being written needs. */
export interface ChatHandle {
  add: (draft: Omit<ChatMessage, 'id'>) => number;
  append: (id: number, token: string) => void;
  patch: (id: number, change: Partial<ChatMessage>) => void;
}

export function isAbort(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

/** How a message ends when its request did not finish. */
export function failureChange(error: unknown): Partial<ChatMessage> {
  if (isAbort(error)) return { status: 'stopped' };
  return { status: 'failed', failure: error instanceof OllamaError ? error.reason : 'stream' };
}

/** Streams the answer into a new assistant message; a failure or a stop is kept on that message. */
export async function answerWithOllama(
  chat: ChatHandle,
  request: Omit<OllamaAnswerRequest, 'onToken'>,
): Promise<void> {
  const id = chat.add({
    role: 'assistant',
    text: '',
    engine: 'ollama',
    model: request.model,
    status: 'streaming',
  });
  try {
    await runOllamaAnswer({ ...request, onToken: (token) => chat.append(id, token) });
    chat.patch(id, { status: 'done' });
  } catch (error) {
    chat.patch(id, failureChange(error));
  }
}
