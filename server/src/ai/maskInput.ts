import { maskSecrets } from '../analysis/masking';
import type { AnalyzeInput } from './AIProvider';

/**
 * The last barrier before a model provider: whatever the caller built, the excerpt and the
 * structured document are masked again here, so a path that forgot to mask cannot send a secret
 * out. Every provider that talks to a model over the network calls this first.
 */
export function maskInputForModel(input: AnalyzeInput): AnalyzeInput {
  const masked: AnalyzeInput = { ...input, excerpt: maskSecrets(input.excerpt).text };
  if (input.structured !== undefined) {
    masked.structured = {
      ...input.structured,
      contextJson: maskSecrets(input.structured.contextJson).text,
    };
  }
  return masked;
}
