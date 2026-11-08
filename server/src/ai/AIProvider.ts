import type { Language } from '../types/language';
import type { NoiseSummary } from '../parser/noiseFilter';
import type { Severity } from '../types/report';
import type { AIReport } from './schema';

/** The correlated events of the log, built by code for a model to reason about. */
export interface StructuredInput {
  /** The JSON document of events, links, groups and candidate incidents. */
  contextJson: string;
  /** The incidents the model is asked to judge, by id. */
  incidentIds: string[];
  /** Events that did not fit in the context: the model is told the analysis is partial. */
  omittedEvents: number;
}

export interface ComplexityHint {
  level: 'simple' | 'complex';
  /** How many incidents the deterministic analysis found; with none there is nothing to explain. */
  incidentCount: number;
  reasons: string[];
}

/** What every provider receives: the trimmed excerpt plus the parser's hint. */
export interface AnalyzeInput {
  excerpt: string;
  severityHint: Severity;
  /** What the parser took out before the excerpt was built; the prompt says so to the model. */
  noise?: NoiseSummary;
  /** The language of the report text. English when missing. */
  language?: Language;
  /** Present when the log was analysed by the correlation engine: the model judges its incidents. */
  structured?: StructuredInput;
  /** How hard the deterministic analysis found the log. The hybrid provider decides with it. */
  complexity?: ComplexityHint;
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
