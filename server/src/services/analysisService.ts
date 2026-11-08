import { getAIProvider } from '../ai';
import type { AIProvider, AnalyzeInput } from '../ai/AIProvider';
import { limitsFromEnv } from '../ai/aiBudget';
import { buildIncidentReports } from '../ai/incidentReport';
import { checkLegacyFields } from '../ai/legacyFields';
import type { ValidationContext } from '../ai/evidenceValidator';
import { incidentText } from '../content/localized';
import { renderIncidentsMarkdown } from '../ai/incidentMarkdown';
import { raiseSeverity, SEVERITY_ORDER } from '../ai/ruleMatching';
import { runEngine } from '../ai/runEngine';
import type { AIReport, IncidentAssessment } from '../ai/schema';
import { buildStructuredContext } from '../ai/structuredContext';
import { analyzeStructure, type StructuredAnalysis } from '../analysis/analyzeStructure';
import { findInjectionAttempts } from '../analysis/promptInjection';
import { env } from '../config/env';
import { AppError } from '../middleware/errorHandler';
import { detectFormat } from '../parser/detectFormat';
import { parseLog } from '../parser/logParser';
import { DEFAULT_LANGUAGE, type Language } from '../types/language';
import type {
  CoverageInfo,
  EngineInfo,
  IncidentReport,
  InjectionAttempt,
  Severity,
  ValidationInfo,
} from '../types/report';
import { addCorrelation } from './addCorrelation';

/** The report of an analysis: the engine's report plus what the server found and checked. */
export type FullReport = AIReport & {
  incidents?: IncidentReport[];
  engine?: EngineInfo;
  coverage?: CoverageInfo;
  validation?: ValidationInfo;
  promptInjection?: InjectionAttempt[];
};

export interface AnalyzeOutcome {
  report: FullReport;
  meta: {
    provider: string;
    totalLines: number;
    matchedCount: number;
    truncated: boolean;
  };
}

/** The most the markdown of a report may hold; the incident section is cut to fit under it. */
const MAX_MARKDOWN_CHARS = 20_000;
const MAX_TITLE_CHARS = 300;

function coverageOf(analysis: StructuredAnalysis): CoverageInfo {
  const { coverage } = analysis.selection;
  return {
    totalLines: coverage.totalLines,
    acquiredEvents: coverage.acquiredEvents,
    notAcquired: coverage.notAcquired,
    selectedEvents: coverage.selectedEvents,
    ignoredRoutine: coverage.ignoredRoutine,
    notSelected: coverage.notSelected,
    cutByBudget: coverage.cutByBudget,
    complete: coverage.complete,
    limits: coverage.limits.map((limit) => ({ code: limit.code, count: limit.count })),
  };
}

/** The model's assessments count only when a model really answered. */
function assessmentsFor(
  aiUsed: boolean,
  assessments: IncidentAssessment[] | undefined,
): IncidentAssessment[] | undefined {
  if (!aiUsed) {
    return undefined;
  }
  return assessments;
}

/** How many of the report's incidents the model really assessed (an id it made up does not count). */
function countAssessed(
  incidents: IncidentReport[],
  assessments: IncidentAssessment[] | undefined,
): number {
  if (assessments === undefined) {
    return 0;
  }
  const ids = new Set(incidents.map((incident) => incident.id));
  return assessments.filter((assessment) => ids.has(assessment.incidentId)).length;
}

function highestSeverity(severities: Severity[], floor: Severity): Severity {
  return severities.reduce((current, severity) => raiseSeverity(current, severity), floor);
}

/**
 * The title and category of the report. The rules engine names the first matching line; when the
 * correlation engine found incidents, the report is named after the most serious one, so the title
 * and the incidents agree. A model's own title is kept: it has read the whole story.
 */
function headlineOf(
  engineUsed: string,
  incidents: IncidentReport[],
  report: AIReport,
): { title: string; category: string } {
  const [mostSerious] = [...incidents].sort(
    (a, b) => SEVERITY_ORDER.indexOf(b.severity) - SEVERITY_ORDER.indexOf(a.severity),
  );
  if (engineUsed !== 'rules' || mostSerious === undefined) {
    return { title: report.title, category: report.category };
  }
  return { title: mostSerious.title.slice(0, MAX_TITLE_CHARS), category: mostSerious.category };
}

/** Appends the incident section to the Markdown, when it still fits under the size limit. */
function withIncidentMarkdown(markdown: string, section: string): string {
  if (section === '' || markdown.length + section.length + 2 > MAX_MARKDOWN_CHARS) {
    return markdown;
  }
  return `${markdown}\n\n${section}`;
}

/**
 * The core use-case of LogLens: raw log -> every event read and correlated -> incidents with a
 * root cause -> engine (rules or model) -> checked against the log -> report. There is no database
 * here on purpose; persistence is wired in the API layer, which keeps this function easy to test.
 *
 * The deterministic analysis always runs. The model, when the configuration and the complexity of
 * the log call for it, judges the incidents it is given; whatever it says is checked against the
 * log before it reaches the report.
 */
export function analyzeLog(
  rawLog: string,
  language: Language = DEFAULT_LANGUAGE,
): Promise<AnalyzeOutcome> {
  return analyzeLogWith(getAIProvider(), rawLog, language);
}

/** The same analysis with a given provider: what the benchmarks and the tests use. */
export async function analyzeLogWith(
  provider: AIProvider,
  rawLog: string,
  language: Language = DEFAULT_LANGUAGE,
): Promise<AnalyzeOutcome> {
  if (rawLog.trim() === '') {
    throw new AppError(400, 'Log text is empty.');
  }

  const parsed = parseLog(rawLog);
  const analysis = analyzeStructure(rawLog, {
    selection: { maxEvents: env.ANALYSIS_MAX_SELECTED_EVENTS },
  });
  const limits = limitsFromEnv();
  const incidentCount = analysis.incidents.length;

  const structuredContext = buildStructuredContext(analysis, limits);
  // A model is only given structured incidents when there are incidents to judge.
  let structuredInput: AnalyzeInput['structured'];
  if (incidentCount > 0) {
    structuredInput = {
      contextJson: structuredContext.json,
      incidentIds: structuredContext.incidentIds,
      omittedEvents: structuredContext.omittedEvents,
    };
  }
  const run = await runEngine(provider, {
    excerpt: parsed.excerpt,
    severityHint: parsed.severityHint,
    noise: parsed.noise,
    language,
    complexity: {
      level: analysis.complexity.level,
      incidentCount,
      reasons: analysis.complexity.reasons,
    },
    structured: structuredInput,
  });

  const { incidentAssessments, ...modelReport } = run.report;
  const assessments = assessmentsFor(run.run.aiUsed, incidentAssessments);
  const validationContext: ValidationContext = {
    eventsById: new Map(analysis.log.events.map((event) => [event.eventId, event])),
    rawLog,
  };
  const built = buildIncidentReports({
    analysis,
    language,
    context: validationContext,
    assessments,
  });

  const engine: EngineInfo = {
    requested: provider.name as EngineInfo['requested'],
    used: run.run.used,
    aiUsed: run.run.aiUsed,
    fallbackReason: run.run.fallbackReason,
    complexity: analysis.complexity.level,
    complexityReasons: analysis.complexity.reasons,
    assessedIncidents: countAssessed(built.incidents, assessments),
  };
  const coverage = coverageOf(analysis);
  const injections = findInjectionAttempts(analysis.log.events);

  // The title, causes, steps and issue text written by a model are checked against the log too.
  let checkedModelReport = modelReport;
  let validation = built.validation;
  if (run.run.aiUsed) {
    const text = incidentText(language);
    const fallbackTitle = built.incidents[0]?.title ?? text.neutralTitle;
    const legacy = checkLegacyFields(
      modelReport,
      built.incidents,
      validationContext,
      text,
      fallbackTitle,
    );
    checkedModelReport = legacy.report;
    validation = {
      checked: built.validation.checked + legacy.checked,
      issues: [...built.validation.issues, ...legacy.issues],
    };
  }

  const withCorrelation = addCorrelation(
    checkedModelReport,
    parsed.excerpt,
    parsed.severityHint,
    language,
  );
  const headline = headlineOf(run.run.used, built.incidents, withCorrelation);
  const report: FullReport = {
    ...withCorrelation,
    title: headline.title,
    category: headline.category,
    format: detectFormat(rawLog, language),
    severity: highestSeverity(
      built.incidents.map((incident) => incident.severity),
      withCorrelation.severity,
    ),
    bugReportMarkdown: withIncidentMarkdown(
      withCorrelation.bugReportMarkdown,
      renderIncidentsMarkdown(built.incidents, engine, coverage, language),
    ),
    incidents: built.incidents,
    engine,
    coverage,
    validation,
    promptInjection: injections,
  };

  return {
    report,
    meta: {
      provider: provider.name,
      totalLines: parsed.totalLines,
      matchedCount: parsed.matchedCount,
      truncated: parsed.truncated,
    },
  };
}
