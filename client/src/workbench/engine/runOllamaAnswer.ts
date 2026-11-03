import type { AnalysisRecord } from '../../lib/types';
import { streamChat } from './ollamaClient';
import { buildOllamaMessages } from './prompt';

export interface OllamaAnswerRequest {
  baseUrl: string;
  model: string;
  record: AnalysisRecord;
  question: string;
  language: 'en' | 'it';
  signal: AbortSignal;
  onToken: (text: string) => void;
  fetchImpl?: typeof fetch;
}

/** Asks the local model and hands each piece of the answer to onToken while it arrives. */
export async function runOllamaAnswer(request: OllamaAnswerRequest): Promise<void> {
  const { baseUrl, model, record, question, language, signal, onToken, fetchImpl } = request;
  const messages = buildOllamaMessages(record, question, language);
  for await (const token of streamChat({ baseUrl, model, messages, signal, fetchImpl })) {
    onToken(token);
  }
}
