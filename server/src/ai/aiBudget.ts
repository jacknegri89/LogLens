import { env } from '../config/env';

/**
 * The limits on what one analysis may spend on a language model: how much text it may send, how
 * many calls it may make and what it may cost. The check runs before the call, so an analysis that
 * would break a limit never reaches the provider: it falls back to the rules and says why.
 */

/** A rough size of a token in characters: good enough to bound the cost, not to bill it. */
const CHARS_PER_TOKEN = 4;
const TOKENS_PER_MILLION = 1_000_000;

/** The answer is billed per token; this caps it, and is also what the cost estimate assumes. */
export const MAX_OUTPUT_TOKENS = 3000;

export interface AiLimits {
  maxContextChars: number;
  maxContextEvents: number;
  maxCallsPerAnalysis: number;
  maxCostUsdPerAnalysis: number;
  inputUsdPerMillionTokens: number;
  outputUsdPerMillionTokens: number;
  timeoutMs: number;
}

export function limitsFromEnv(): AiLimits {
  return {
    maxContextChars: env.AI_CONTEXT_MAX_CHARS,
    maxContextEvents: env.AI_CONTEXT_MAX_EVENTS,
    maxCallsPerAnalysis: env.AI_MAX_CALLS_PER_ANALYSIS,
    maxCostUsdPerAnalysis: env.AI_MAX_COST_USD_PER_ANALYSIS,
    inputUsdPerMillionTokens: env.AI_INPUT_USD_PER_MILLION_TOKENS,
    outputUsdPerMillionTokens: env.AI_OUTPUT_USD_PER_MILLION_TOKENS,
    timeoutMs: env.AI_TIMEOUT_MS,
  };
}

/** The system prompt and the output contract, which come on top of the log context. */
const PROMPT_OVERHEAD_CHARS = 12_000;

export function estimateTokens(characters: number): number {
  return Math.ceil(characters / CHARS_PER_TOKEN);
}

/** The cost in US dollars of one call, with the output counted at its maximum. */
export function estimateCostUsd(inputTokens: number, limits: AiLimits): number {
  const input = (inputTokens / TOKENS_PER_MILLION) * limits.inputUsdPerMillionTokens;
  const output = (MAX_OUTPUT_TOKENS / TOKENS_PER_MILLION) * limits.outputUsdPerMillionTokens;
  return input + output;
}

export interface BudgetDecision {
  allowed: boolean;
  /** Why the call is not allowed; null when it is. */
  reason: string | null;
  estimatedCostUsd: number;
}

/**
 * @param promptChars the size of everything sent to the model
 * @param callsAlreadyMade the model calls this analysis has made so far
 */
export function checkBudget(
  promptChars: number,
  callsAlreadyMade: number,
  limits: AiLimits,
): BudgetDecision {
  const estimatedCostUsd = estimateCostUsd(estimateTokens(promptChars), limits);
  if (callsAlreadyMade >= limits.maxCallsPerAnalysis) {
    return {
      allowed: false,
      reason: 'the limit of model calls per analysis is reached',
      estimatedCostUsd,
    };
  }
  if (promptChars > limits.maxContextChars + PROMPT_OVERHEAD_CHARS) {
    return {
      allowed: false,
      reason: 'the context is larger than the allowed size',
      estimatedCostUsd,
    };
  }
  if (estimatedCostUsd > limits.maxCostUsdPerAnalysis) {
    return { allowed: false, reason: 'the estimated cost is above the limit', estimatedCostUsd };
  }
  return { allowed: true, reason: null, estimatedCostUsd };
}
