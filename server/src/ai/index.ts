import { env } from '../config/env';
import type { AIProvider } from './AIProvider';
import { HybridProvider } from './providers/hybridProvider';
import { MockProvider } from './providers/mockProvider';
import { OllamaProvider } from './providers/ollamaProvider';
import { OpenAIProvider } from './providers/openaiProvider';
import { RulesProvider } from './providers/rulesProvider';

const PROVIDER_FACTORIES: Record<typeof env.AI_PROVIDER, () => AIProvider> = {
  openai: () => new OpenAIProvider(),
  hybrid: () => new HybridProvider(new RulesProvider(), new OpenAIProvider()),
  ollama: () => new OllamaProvider(),
  rules: () => new RulesProvider(),
  mock: () => new MockProvider(),
};

let cached: AIProvider | undefined;

/**
 * Returns the AI provider selected by the `AI_PROVIDER` env var. Built once and
 * reused. The rest of the app only sees the `AIProvider` interface — it never
 * imports a specific provider, so swapping engines is a config change.
 */
export function getAIProvider(): AIProvider {
  cached ??= (PROVIDER_FACTORIES[env.AI_PROVIDER] ?? PROVIDER_FACTORIES.mock)();
  return cached;
}

export type { AIProvider, AnalyzeInput } from './AIProvider';
