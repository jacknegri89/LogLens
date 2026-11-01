import { env } from '../config/env';
import type { AIProvider } from './AIProvider';
import { MockProvider } from './providers/mockProvider';
import { OllamaProvider } from './providers/ollamaProvider';
import { OpenAIProvider } from './providers/openaiProvider';
import { RulesProvider } from './providers/rulesProvider';

let cached: AIProvider | undefined;

/**
 * Returns the AI provider selected by the `AI_PROVIDER` env var. Built once and
 * reused. The rest of the app only sees the `AIProvider` interface — it never
 * imports a specific provider, so swapping engines is a config change.
 */
export function getAIProvider(): AIProvider {
  if (cached) return cached;

  switch (env.AI_PROVIDER) {
    case 'openai':
      cached = new OpenAIProvider();
      break;
    case 'ollama':
      cached = new OllamaProvider();
      break;
    case 'rules':
      cached = new RulesProvider();
      break;
    case 'mock':
    default:
      cached = new MockProvider();
  }

  return cached;
}

export type { AIProvider, AnalyzeInput } from './AIProvider';
