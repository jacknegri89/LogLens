import type { AIProvider, AnalyzeInput } from './AIProvider';
import type { EngineRun, TracedReport } from './providers/hybridProvider';

/**
 * Runs the configured provider and says which engine really produced the analysis. A hybrid
 * provider reports its own routing and fallbacks; the other providers are what their name says.
 * Nothing here labels a report as the work of a model unless a model answered.
 */

const MODEL_PROVIDERS = ['openai', 'ollama'];

interface TracingProvider extends AIProvider {
  analyzeTraced(input: AnalyzeInput): Promise<TracedReport>;
}

function isTracing(provider: AIProvider): provider is TracingProvider {
  return typeof (provider as Partial<TracingProvider>).analyzeTraced === 'function';
}

export async function runEngine(provider: AIProvider, input: AnalyzeInput): Promise<TracedReport> {
  if (isTracing(provider)) {
    return provider.analyzeTraced(input);
  }
  const report = await provider.analyze(input);
  const run: EngineRun = {
    used: provider.name,
    aiUsed: MODEL_PROVIDERS.includes(provider.name),
    fallbackReason: null,
  };
  return { report, run };
}
