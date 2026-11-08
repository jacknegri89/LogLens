import { normalizeLog, type NormalizeOptions, type NormalizedLog } from '../parser/normalizeLog';
import { evaluateComplexity, type ComplexityAssessment } from './complexity';
import {
  DEFAULT_SELECTION_OPTIONS,
  selectContext,
  type ContextSelection,
  type SelectionOptions,
} from './contextSelection';
import type { EventCorrelation } from './correlationTypes';
import { buildEventCorrelation } from './eventCorrelation';
import { buildIncidents } from './incidents';
import { looksLikeInjection } from './promptInjection';
import type { Incident } from './incidentTypes';

/**
 * The deterministic part of the analysis, from the raw text to the incidents: it parses every line,
 * selects the context, correlates the events and works out the incidents and their root causes.
 * No model is involved, so the result is the same on every run and costs nothing.
 */

export interface StructuredAnalysis {
  log: NormalizedLog;
  selection: ContextSelection;
  correlation: EventCorrelation;
  incidents: Incident[];
  complexity: ComplexityAssessment;
}

export interface StructureOptions {
  normalize?: NormalizeOptions;
  selection?: Partial<SelectionOptions>;
}

export function analyzeStructure(
  rawLog: string,
  options: StructureOptions = {},
): StructuredAnalysis {
  const log = normalizeLog(rawLog, options.normalize);
  const selection = selectContext(log, { ...DEFAULT_SELECTION_OPTIONS, ...options.selection });
  const correlation = buildEventCorrelation(selection);
  const injected = new Set(
    log.events.filter((event) => looksLikeInjection(event.raw)).map((event) => event.eventId),
  );
  const incidents = buildIncidents(selection, correlation, injected);
  const complexity = evaluateComplexity(incidents, selection.coverage);
  return { log, selection, correlation, incidents, complexity };
}
