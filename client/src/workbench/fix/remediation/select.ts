import type { AnalysisRecord } from '../../../lib/types';
import { SCENARIO_SIGNALS } from './scenarioSignals';
import { SCENARIO_IDS, type ScenarioId } from './types';

/** The parts of an analysis the selector reads. */
export interface AnalysisSignals {
  title: string;
  category: string;
  keyLines: string[];
  causes: string[];
  debugSteps: string[];
  findingTitles: string[];
}

export interface RankedScenario {
  id: ScenarioId;
  score: number;
}

const TITLE_WEIGHT = 3;
const KEY_LINE_WEIGHT = 3;
const CAUSE_WEIGHT = 2;
const FINDING_WEIGHT = 2;
const STEP_WEIGHT = 1;
const CATEGORY_WEIGHT = 3;

export function signalsFromRecord(record: AnalysisRecord): AnalysisSignals {
  return {
    title: record.title,
    category: record.category,
    keyLines: record.report.keyLines,
    causes: record.report.causes,
    debugSteps: record.report.debugSteps,
    findingTitles: (record.report.findings ?? []).map((finding) => finding.title),
  };
}

function hits(keywords: string[], texts: string[]): number {
  const haystack = texts.join('\n').toLowerCase();
  return keywords.filter((keyword) => haystack.includes(keyword)).length;
}

function scoreScenario(id: ScenarioId, signals: AnalysisSignals): number {
  const { keywords, categories } = SCENARIO_SIGNALS[id];
  let categoryMatch = 0;
  if (categories.includes(signals.category.toLowerCase())) {
    categoryMatch = CATEGORY_WEIGHT;
  }
  return (
    categoryMatch +
    hits(keywords, [signals.title]) * TITLE_WEIGHT +
    hits(keywords, signals.keyLines) * KEY_LINE_WEIGHT +
    hits(keywords, signals.causes) * CAUSE_WEIGHT +
    hits(keywords, signals.findingTitles) * FINDING_WEIGHT +
    hits(keywords, signals.debugSteps) * STEP_WEIGHT
  );
}

/** Every scenario with its score, best first; equal scores keep the catalog order. */
export function rankScenarios(signals: AnalysisSignals): RankedScenario[] {
  const ranked = SCENARIO_IDS.map((id) => ({ id, score: scoreScenario(id, signals) }));
  return ranked.sort((first, second) => second.score - first.score);
}

/** The best scenario, and whether anything in the analysis actually pointed to it. */
export function selectScenario(signals: AnalysisSignals): { id: ScenarioId; matched: boolean } {
  const [best] = rankScenarios(signals);
  return { id: best.id, matched: best.score > 0 };
}
