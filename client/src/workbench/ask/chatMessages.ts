import type { OllamaFailure } from '../engine/ollamaClient';

export interface ChatMessage {
  id: number;
  role: 'user' | 'assistant';
  text: string;
  engine?: 'builtin' | 'ollama';
  /** The Ollama model that wrote the answer. */
  model?: string;
  status?: 'streaming' | 'done' | 'stopped' | 'failed';
  failure?: OllamaFailure | 'noModel';
}

export const MAX_MESSAGES = 40;
export const MAX_ANSWER_CHARACTERS = 8_000;

/** The list with the message added at the end; the oldest messages go when there are too many. */
export function addMessage(messages: ChatMessage[], message: ChatMessage): ChatMessage[] {
  return [...messages, message].slice(-MAX_MESSAGES);
}

export function patchMessage(
  messages: ChatMessage[],
  id: number,
  change: Partial<ChatMessage>,
): ChatMessage[] {
  return messages.map((message) => {
    if (message.id === id) {
      return { ...message, ...change };
    }
    return message;
  });
}

/** Adds streamed text to a message, never growing it past MAX_ANSWER_CHARACTERS. */
export function appendToken(messages: ChatMessage[], id: number, token: string): ChatMessage[] {
  return messages.map((message) => {
    if (message.id !== id) {
      return message;
    }
    return { ...message, text: (message.text + token).slice(0, MAX_ANSWER_CHARACTERS) };
  });
}
