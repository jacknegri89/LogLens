import { checkBudget, estimateCostUsd, estimateTokens, type AiLimits } from '../src/ai/aiBudget';
import { checkEvidence } from '../src/ai/evidenceValidator';
import { RulesProvider } from '../src/ai/providers/rulesProvider';
import { SEVERITY_ORDER } from '../src/ai/ruleMatching';
import { buildStructuredContext } from '../src/ai/structuredContext';
import { analyzeStructure, type StructuredAnalysis } from '../src/analysis/analyzeStructure';
import type { Incident } from '../src/analysis/incidentTypes';
import { parseLog } from '../src/parser/logParser';
import { analyzeLogWith, type FullReport } from '../src/services/analysisService';
import type { NormalizedLogEvent } from '../src/parser/normalizedEvent';
import type { ExpectedIncident, Scenario } from './scenarioTypes';

/**
 * Scores the analysis of a scenario against what a correct analysis looks like. No model is called:
 * the engine under test is the deterministic one, so a run is repeatable and costs nothing. The AI
 * cost reported is the cost the model call WOULD have had for the context built from the log.
 *
 * Metrics (a number from 0 to 1, or null when the scenario has nothing to measure):
 * - parsingAccuracy: the checked fields of the sample events that were read as expected.
 * - eventCoverage: the relevant events that reached the analysis.
 * - incidentPrecision: the incidents found that match an expected one.
 * - incidentRecall: the expected incidents that were found.
 * - rootCauseAccuracy: the expected root causes found with the expected status and source event.
 * - falsePositiveRate: the incidents found that no expected incident explains.
 * - evidenceValidity: the evidence of the report that matches the original log.
 */

/** The size limits used to estimate the cost of a model call. The defaults of the server. */
export const BENCHMARK_LIMITS: AiLimits = {
  maxContextChars: 24_000,
  maxContextEvents: 250,
  maxCallsPerAnalysis: 1,
  maxCostUsdPerAnalysis: 0.05,
  inputUsdPerMillionTokens: 0.15,
  outputUsdPerMillionTokens: 0.6,
  timeoutMs: 20_000,
};

/** The share of an expected incident's events that a found incident must contain to count as it. */
const MATCH_SHARE = 0.5;

export interface ScenarioResult {
  id: string;
  parsingAccuracy: number | null;
  eventCoverage: number | null;
  incidentPrecision: number | null;
  incidentRecall: number | null;
  rootCauseAccuracy: number | null;
  falsePositiveRate: number;
  evidenceValidity: number;
  foundIncidents: number;
  expectedIncidents: number;
  processingMs: number;
  /** The model calls the analysis made (none: the benchmark runs the deterministic engine). */
  aiCalls: number;
  /** What a model call would cost for the context of this log, in US dollars. */
  estimatedAiCostUsd: number;
  contextChars: number;
  /** Everything that did not match the expectations, in words. Empty when the scenario passes. */
  failures: string[];
}

export interface LegacyResult {
  id: string;
  eventCoverage: number | null;
  incidentPrecision: number | null;
  incidentRecall: number | null;
  rootCauseAccuracy: number | null;
  falsePositiveRate: number;
  foundIncidents: number;
}

function ratio(passed: number, total: number): number | null {
  if (total === 0) {
    return null;
  }
  return passed / total;
}

function eventWith(events: NormalizedLogEvent[], marker: string): NormalizedLogEvent | undefined {
  return events.find((event) => event.raw.includes(marker));
}

function parsingScore(scenario: Scenario, events: NormalizedLogEvent[], failures: string[]) {
  let passed = 0;
  let total = 0;
  for (const expected of scenario.expected.sampleEvents) {
    const event = eventWith(events, expected.marker);
    const checks: [string, unknown, unknown][] = [];
    const fieldChecks: [string, unknown, unknown][] = [
      ['level', expected.level, event?.level],
      ['service', expected.service, event?.service],
      ['timestamp', expected.timestamp, event?.timestamp],
      ['format', expected.format, event?.format],
      ['lineStart', expected.lineStart, event?.originalLineStart],
      ['lineEnd', expected.lineEnd, event?.originalLineEnd],
    ];
    for (const check of fieldChecks) {
      if (check[1] !== undefined) {
        checks.push(check);
      }
    }
    if (event === undefined) {
      total += Math.max(1, checks.length);
      failures.push(`parsing: no event contains "${expected.marker}"`);
      continue;
    }
    for (const [field, wanted, actual] of checks) {
      total += 1;
      if (wanted === actual) {
        passed += 1;
      } else {
        failures.push(
          `parsing: "${expected.marker}" ${field} is ${String(actual)}, expected ${String(wanted)}`,
        );
      }
    }
  }
  return ratio(passed, total);
}

function coverageScore(
  scenario: Scenario,
  analysis: StructuredAnalysis,
  failures: string[],
): number | null {
  const selectedIds = new Set(analysis.selection.selected.map((entry) => entry.event.eventId));
  let seen = 0;
  for (const marker of scenario.expected.relevantMarkers) {
    const event = eventWith(analysis.log.events, marker);
    if (event !== undefined && selectedIds.has(event.eventId)) {
      seen += 1;
    } else {
      failures.push(`coverage: the event "${marker}" did not reach the analysis`);
    }
  }
  return ratio(seen, scenario.expected.relevantMarkers.length);
}

function eventsOfIncident(incident: Incident, events: NormalizedLogEvent[]): NormalizedLogEvent[] {
  const ids = new Set([...incident.anomalyEventIds, ...incident.contextEventIds]);
  return events.filter((event) => ids.has(event.eventId));
}

function overlapOf(expected: ExpectedIncident, incidentEvents: NormalizedLogEvent[]): number {
  const present = expected.markers.filter((marker) =>
    incidentEvents.some((event) => event.raw.includes(marker)),
  );
  return present.length / Math.max(1, expected.markers.length);
}

function bestMatch(
  expected: ExpectedIncident,
  incidents: Incident[],
  events: NormalizedLogEvent[],
): Incident | undefined {
  let best: Incident | undefined;
  let bestOverlap = 0;
  for (const incident of incidents) {
    const overlap = overlapOf(expected, eventsOfIncident(incident, events));
    if (overlap > bestOverlap) {
      best = incident;
      bestOverlap = overlap;
    }
  }
  if (bestOverlap < MATCH_SHARE) {
    return undefined;
  }
  return best;
}

function severityProblems(expected: ExpectedIncident, incident: Incident): string[] {
  const rank = SEVERITY_ORDER.indexOf(incident.severity.severity);
  const problems: string[] = [];
  if (expected.minSeverity !== undefined && rank < SEVERITY_ORDER.indexOf(expected.minSeverity)) {
    problems.push(`severity ${incident.severity.severity} is below ${expected.minSeverity}`);
  }
  if (expected.maxSeverity !== undefined && rank > SEVERITY_ORDER.indexOf(expected.maxSeverity)) {
    problems.push(`severity ${incident.severity.severity} is above ${expected.maxSeverity}`);
  }
  return problems;
}

interface IncidentScores {
  precision: number | null;
  recall: number | null;
  rootCause: number | null;
  falsePositiveRate: number;
}

function incidentScores(
  scenario: Scenario,
  analysis: StructuredAnalysis,
  failures: string[],
): IncidentScores {
  const { events } = analysis.log;
  const found = analysis.incidents;
  const matchedFound = new Set<string>();
  let matchedExpected = 0;
  let rootCausesChecked = 0;
  let rootCausesRight = 0;
  for (const expected of scenario.expected.incidents) {
    const incident = bestMatch(expected, found, events);
    if (incident === undefined) {
      failures.push(`incident "${expected.name}" was not found`);
      if (expected.rootCauseStatus !== undefined) {
        rootCausesChecked += 1;
      }
      continue;
    }
    matchedExpected += 1;
    matchedFound.add(incident.id);
    const incidentEvents = eventsOfIncident(incident, events);
    for (const marker of expected.mustNotContainMarkers ?? []) {
      if (incidentEvents.some((event) => event.raw.includes(marker))) {
        failures.push(`incident "${expected.name}" wrongly contains "${marker}"`);
      }
    }
    for (const problem of severityProblems(expected, incident)) {
      failures.push(`incident "${expected.name}": ${problem}`);
    }
    if (expected.affectedEntities !== undefined) {
      const wanted = [...expected.affectedEntities].sort().join(',');
      const actual = [...incident.impact.affectedEntities].sort().join(',');
      if (wanted !== actual) {
        failures.push(
          `incident "${expected.name}": affected entities are [${actual}], expected [${wanted}]`,
        );
      }
    }
    if (expected.rootCauseStatus === undefined) {
      continue;
    }
    rootCausesChecked += 1;
    const source = events.find((event) => event.eventId === incident.rootCause.sourceEventId);
    const statusRight = incident.rootCause.status === expected.rootCauseStatus;
    const sourceRight =
      expected.rootCauseMarker === undefined ||
      source?.raw.includes(expected.rootCauseMarker) === true;
    if (statusRight && sourceRight) {
      rootCausesRight += 1;
      continue;
    }
    failures.push(
      `incident "${expected.name}": root cause is ${incident.rootCause.status} (${source?.message.slice(0, 50) ?? 'no event'}), expected ${expected.rootCauseStatus} (${expected.rootCauseMarker ?? 'no event'})`,
    );
  }
  const unexplained = found.filter((incident) => !matchedFound.has(incident.id));
  for (const incident of unexplained) {
    failures.push(`unexpected incident ${incident.id}: ${incident.title.slice(0, 80)}`);
  }
  let precision: number | null = 1;
  if (found.length > 0) {
    precision = matchedFound.size / found.length;
  } else if (scenario.expected.incidents.length > 0) {
    precision = null;
  }
  let falsePositiveRate = 0;
  if (found.length > 0) {
    falsePositiveRate = unexplained.length / found.length;
  }
  return {
    precision,
    recall: ratio(matchedExpected, scenario.expected.incidents.length),
    rootCause: ratio(rootCausesRight, rootCausesChecked),
    falsePositiveRate,
  };
}

function evidenceScore(report: FullReport, analysis: StructuredAnalysis): number {
  const context = {
    eventsById: new Map(analysis.log.events.map((event) => [event.eventId, event])),
    rawLog: '',
  };
  let valid = 0;
  let total = 0;
  for (const incident of report.incidents ?? []) {
    for (const reference of [...incident.rootCause.evidence, ...incident.secondarySymptoms]) {
      total += 1;
      if (checkEvidence(reference, context) === null) {
        valid += 1;
      }
    }
  }
  if (total === 0) {
    return 1;
  }
  return valid / total;
}

function reportText(report: FullReport): string {
  return JSON.stringify({
    incidents: report.incidents,
    causes: report.causes,
    debugSteps: report.debugSteps,
    markdown: report.bugReportMarkdown,
  }).toLowerCase();
}

function claimProblems(scenario: Scenario, report: FullReport, failures: string[]): void {
  const text = reportText(report);
  for (const claim of scenario.expected.forbiddenClaims ?? []) {
    if (text.includes(claim.toLowerCase())) {
      failures.push(`the report claims "${claim}", which the log does not support`);
    }
  }
  const injected = (report.promptInjection ?? []).length > 0;
  if (scenario.expected.containsInjection === true && !injected) {
    failures.push('the injection attempt was not reported');
  }
  if (scenario.expected.containsInjection !== true && injected) {
    failures.push('an injection attempt was reported in a log that has none');
  }
  const complete = report.coverage?.complete === true;
  if (scenario.expected.mustBePartial === true && complete) {
    failures.push('the analysis is partial but was reported as complete');
  }
  if (scenario.expected.mustBePartial !== true && !complete) {
    failures.push('the analysis was reported as partial');
  }
  if ((report.validation?.issues.length ?? 0) > 0) {
    failures.push(
      `the validator found ${report.validation?.issues.length} issues in a deterministic report`,
    );
  }
}

export async function evaluateScenario(scenario: Scenario): Promise<ScenarioResult> {
  const failures: string[] = [];
  const started = performance.now();
  const { report } = await analyzeLogWith(new RulesProvider(), scenario.log);
  const processingMs = performance.now() - started;
  const analysis = analyzeStructure(scenario.log);
  const parsing = parsingScore(scenario, analysis.log.events, failures);
  const coverage = coverageScore(scenario, analysis, failures);
  const incidents = incidentScores(scenario, analysis, failures);
  claimProblems(scenario, report, failures);
  const context = buildStructuredContext(analysis, BENCHMARK_LIMITS);
  const promptChars = context.json.length;
  const budget = checkBudget(promptChars, 0, BENCHMARK_LIMITS);
  return {
    id: scenario.id,
    parsingAccuracy: parsing,
    eventCoverage: coverage,
    incidentPrecision: incidents.precision,
    incidentRecall: incidents.recall,
    rootCauseAccuracy: incidents.rootCause,
    falsePositiveRate: incidents.falsePositiveRate,
    evidenceValidity: evidenceScore(report, analysis),
    foundIncidents: analysis.incidents.length,
    expectedIncidents: scenario.expected.incidents.length,
    processingMs: Math.round(processingMs * 10) / 10,
    aiCalls: 0,
    estimatedAiCostUsd: Math.round(budget.estimatedCostUsd * 1_000_000) / 1_000_000,
    contextChars: promptChars,
    failures,
  };
}

/**
 * The previous analysis (keyword filter, findings, root cause of the rules) on the same scenario,
 * scored with the same definitions so the two can be compared.
 */
export async function evaluateLegacy(scenario: Scenario): Promise<LegacyResult> {
  const parsed = parseLog(scenario.log);
  const report = await new RulesProvider().analyze({
    excerpt: parsed.excerpt,
    severityHint: parsed.severityHint,
  });
  const evidenceLists: string[] = (report.findings ?? []).map((finding) => finding.evidence);
  if (evidenceLists.length === 0 && report.severity !== 'informational') {
    evidenceLists.push(report.keyLines.join('\n'));
  }
  const rootEvidence = (report.timeline ?? [])
    .filter((entry) => entry.role === 'root')
    .map((entry) => entry.evidence)
    .join('\n');
  const expected = scenario.expected.incidents;
  const matchedFound = new Set<number>();
  let matchedExpected = 0;
  let rootChecked = 0;
  let rootRight = 0;
  for (const wanted of expected) {
    const index = evidenceLists.findIndex((evidence) =>
      wanted.markers.some((marker) => evidence.includes(marker)),
    );
    if (index !== -1) {
      matchedExpected += 1;
      matchedFound.add(index);
    }
    if (wanted.rootCauseMarker !== undefined) {
      rootChecked += 1;
      if (rootEvidence.includes(wanted.rootCauseMarker)) {
        rootRight += 1;
      }
    }
  }
  const covered = scenario.expected.relevantMarkers.filter((marker) =>
    parsed.excerpt.includes(marker),
  );
  let precision: number | null = 1;
  if (evidenceLists.length > 0) {
    precision = matchedFound.size / evidenceLists.length;
  } else if (expected.length > 0) {
    precision = null;
  }
  let falsePositiveRate = 0;
  if (evidenceLists.length > 0) {
    falsePositiveRate = (evidenceLists.length - matchedFound.size) / evidenceLists.length;
  }
  return {
    id: scenario.id,
    eventCoverage: ratio(covered.length, scenario.expected.relevantMarkers.length),
    incidentPrecision: precision,
    incidentRecall: ratio(matchedExpected, expected.length),
    rootCauseAccuracy: ratio(rootRight, rootChecked),
    falsePositiveRate,
    foundIncidents: evidenceLists.length,
  };
}

function mean(values: (number | null)[]): number | null {
  const present = values.filter((value): value is number => value !== null);
  if (present.length === 0) {
    return null;
  }
  const total = present.reduce((sum, value) => sum + value, 0);
  return Math.round((total / present.length) * 1000) / 1000;
}

export interface Aggregate {
  parsingAccuracy: number | null;
  eventCoverage: number | null;
  incidentPrecision: number | null;
  incidentRecall: number | null;
  rootCauseAccuracy: number | null;
  falsePositiveRate: number | null;
  evidenceValidity: number | null;
}

export function aggregateResults(results: ScenarioResult[]): Aggregate {
  return {
    parsingAccuracy: mean(results.map((result) => result.parsingAccuracy)),
    eventCoverage: mean(results.map((result) => result.eventCoverage)),
    incidentPrecision: mean(results.map((result) => result.incidentPrecision)),
    incidentRecall: mean(results.map((result) => result.incidentRecall)),
    rootCauseAccuracy: mean(results.map((result) => result.rootCauseAccuracy)),
    falsePositiveRate: mean(results.map((result) => result.falsePositiveRate)),
    evidenceValidity: mean(results.map((result) => result.evidenceValidity)),
  };
}

export function aggregateLegacy(
  results: LegacyResult[],
): Omit<Aggregate, 'parsingAccuracy' | 'evidenceValidity'> {
  return {
    eventCoverage: mean(results.map((result) => result.eventCoverage)),
    incidentPrecision: mean(results.map((result) => result.incidentPrecision)),
    incidentRecall: mean(results.map((result) => result.incidentRecall)),
    rootCauseAccuracy: mean(results.map((result) => result.rootCauseAccuracy)),
    falsePositiveRate: mean(results.map((result) => result.falsePositiveRate)),
  };
}

export interface BenchmarkReport {
  scenarios: ScenarioResult[];
  legacy: LegacyResult[];
  aggregate: Aggregate;
  legacyAggregate: ReturnType<typeof aggregateLegacy>;
}

export async function runBenchmarks(scenarios: Scenario[]): Promise<BenchmarkReport> {
  const results: ScenarioResult[] = [];
  const legacy: LegacyResult[] = [];
  for (const scenario of scenarios) {
    results.push(await evaluateScenario(scenario));
    legacy.push(await evaluateLegacy(scenario));
  }
  return {
    scenarios: results,
    legacy,
    aggregate: aggregateResults(results),
    legacyAggregate: aggregateLegacy(legacy),
  };
}

export { estimateCostUsd, estimateTokens };
