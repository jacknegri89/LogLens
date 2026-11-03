import { useMemo } from 'react';

import type { AnalysisRecord, Severity } from '../../lib/types';
import { useWorkbench } from '../core/useWorkbench';
import { leadSentence, rankCauses, type ConfidenceResult } from './confidence';
import { buildFlameTree, type FlameNode } from './flamegraph';
import { collectLatencies, summarizeLatency, type LatencySummary } from './latency';
import { estimateMttr, type MinutesRange } from './mttr';
import { computeRisk, type RiskAssessment } from './risk';
import { buildTopology, type Topology } from './topology';
import type { ParsedLine } from '../types';

/** What only the analysis can tell: risk, repair time and the ranking of causes. */
export interface ReportInsights {
  severity: Severity;
  title: string;
  category: string;
  risk: RiskAssessment;
  mttr: MinutesRange;
  confidence: ConfidenceResult;
  explanation: string;
}

export interface InsightsModel {
  report: ReportInsights | null;
  topology: Topology;
  flameTree: FlameNode | null;
  latency: LatencySummary | null;
}

function readReport(record: AnalysisRecord, lines: ParsedLine[]): ReportInsights {
  const findings = record.report.findings ?? [];
  const timeline = record.report.timeline ?? [];
  return {
    severity: record.severity,
    title: record.title,
    category: record.category,
    risk: computeRisk({
      severity: record.severity,
      category: record.category,
      lines,
      findings,
      timeline,
    }),
    mttr: estimateMttr(record.category, record.severity),
    confidence: rankCauses({
      causes: record.report.causes,
      keyLines: record.report.keyLines,
      findings,
      timeline,
    }),
    explanation: leadSentence(record.report.overview?.[0]),
  };
}

/** Everything the Insights view shows, computed once per log and per analysis. */
export function useInsightsModel(): InsightsModel {
  const { lines, analysis } = useWorkbench();
  const record = analysis.record;
  const report = useMemo(() => (record ? readReport(record, lines) : null), [record, lines]);
  const topology = useMemo(() => buildTopology(lines, record), [lines, record]);
  const flameTree = useMemo(() => buildFlameTree(lines), [lines]);
  const latency = useMemo(() => summarizeLatency(collectLatencies(lines)), [lines]);
  return { report, topology, flameTree, latency };
}
