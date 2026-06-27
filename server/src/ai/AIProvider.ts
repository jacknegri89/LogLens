import type { Severity } from '../types/report';
import type { AIReport } from './schema';

/** What every provider receives: the trimmed excerpt plus the parser's hint. */
export interface AnalyzeInput {
  excerpt: string;
  severityHint: Severity;
}

/**
 * The single interface the whole app depends on. Mock, OpenAI and Ollama each
 * implement it, so we can swap the engine via one env var and nothing else in
 * the codebase has to change. This is the adapter pattern.
 */
export interface AIProvider {
  readonly name: string;
  analyze(input: AnalyzeInput): Promise<AIReport>;
}
