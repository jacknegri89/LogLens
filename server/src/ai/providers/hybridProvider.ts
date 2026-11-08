import { checkBudget, limitsFromEnv, type AiLimits } from '../aiBudget';
import type { AIProvider, AnalyzeInput } from '../AIProvider';
import { buildSystemPrompt, buildUserPrompt } from '../prompt';
import type { AIReport } from '../schema';
import { hasKnownRule } from './rulesProvider';

/**
 * What a run actually used. The report says this plainly: a report written by the rules is never
 * labelled as the work of a model, and a fallback always says why it happened.
 */
export interface EngineRun {
  /** The provider that wrote the analysis. */
  used: string;
  aiUsed: boolean;
  /** Why the model was not used although the configuration asked for it; null when it was, or when it was not needed. */
  fallbackReason: string | null;
}

export interface TracedReport {
  report: AIReport;
  run: EngineRun;
}

export type RouteTarget = 'rules' | 'model';

export interface Route {
  target: RouteTarget;
  /** Why, in a short sentence: kept for the logs and the tests. */
  reason: string;
}

/**
 * Decides who analyses the log. The rules find the signals and the correlation engine builds the
 * incidents; this decides whether that is enough.
 * - An incident that is complex (several services, a change before the failures, a cause that is
 *   not settled, a partial analysis) goes to the model, even when a known rule matches: a rule
 *   knows one failure, not how several of them fit together.
 * - A log with no incident has nothing to explain, so a model would only cost money.
 * - Otherwise a known rule answers, and a log no rule covers goes to the model.
 */
export function chooseRoute(input: AnalyzeInput): Route {
  const { complexity } = input;
  if (complexity !== undefined && complexity.level === 'complex') {
    return { target: 'model', reason: 'complex incident' };
  }
  if (complexity !== undefined && complexity.incidentCount === 0) {
    return { target: 'rules', reason: 'no incident to explain' };
  }
  if (hasKnownRule(input.excerpt)) {
    return { target: 'rules', reason: 'a known rule explains it' };
  }
  return { target: 'model', reason: 'no rule covers it' };
}

function describeFailure(error: unknown): string {
  if (error instanceof Error && error.message !== '') {
    return error.message;
  }
  return 'unknown error';
}

export class HybridProvider implements AIProvider {
  readonly name = 'hybrid';

  constructor(
    private readonly rules: AIProvider,
    private readonly model: AIProvider,
    private readonly limits: AiLimits = limitsFromEnv(),
  ) {}

  async analyze(input: AnalyzeInput): Promise<AIReport> {
    return (await this.analyzeTraced(input)).report;
  }

  /** The same analysis, with the account of which engine really produced it. */
  async analyzeTraced(input: AnalyzeInput): Promise<TracedReport> {
    const route = chooseRoute(input);
    if (route.target === 'rules') {
      return this.runRules(input, null);
    }
    const promptChars =
      buildSystemPrompt(input.language, input.structured !== undefined).length +
      buildUserPrompt(input).length;
    const budget = checkBudget(promptChars, 0, this.limits);
    if (!budget.allowed) {
      return this.runRules(input, `the model was not called: ${budget.reason}`);
    }
    try {
      const report = await this.model.analyze(input);
      return { report, run: { used: this.model.name, aiUsed: true, fallbackReason: null } };
    } catch (error) {
      return this.runRules(input, `the model was not available: ${describeFailure(error)}`);
    }
  }

  private async runRules(
    input: AnalyzeInput,
    fallbackReason: string | null,
  ): Promise<TracedReport> {
    const report = await this.rules.analyze(input);
    return { report, run: { used: this.rules.name, aiUsed: false, fallbackReason } };
  }
}
