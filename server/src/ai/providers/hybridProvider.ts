import type { AIProvider, AnalyzeInput } from '../AIProvider';
import type { AIReport } from '../schema';
import { hasKnownRule } from './rulesProvider';

/**
 * Rules first, model second. A log that a known rule explains is answered by the
 * rules, at no cost. Only a log that no rule covers goes to the model, so the API
 * is paid only for the cases the rules cannot explain.
 */
export class HybridProvider implements AIProvider {
  readonly name = 'hybrid';

  constructor(
    private readonly rules: AIProvider,
    private readonly model: AIProvider,
  ) {}

  analyze(input: AnalyzeInput): Promise<AIReport> {
    if (hasKnownRule(input.excerpt)) {
      return this.rules.analyze(input);
    }
    return this.model.analyze(input);
  }
}
