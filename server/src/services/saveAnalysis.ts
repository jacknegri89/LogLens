import { createAnalysis } from '../repositories/analysisRepository';
import type { CreateAnalysisBody } from '../schemas/createAnalysis';
import type { Language } from '../types/language';
import { analyzeLog, type FullReport } from './analysisService';

export interface Submitter {
  owner: string;
  clientHash: string;
}

/** The parts of a report that are saved with the analysis. */
function pickStoredReport(report: FullReport) {
  return {
    keyLines: report.keyLines,
    causes: report.causes,
    debugSteps: report.debugSteps,
    bugReportMarkdown: report.bugReportMarkdown,
    format: report.format,
    findings: report.findings,
    overview: report.overview,
    timeline: report.timeline,
    incidents: report.incidents,
    engine: report.engine,
    coverage: report.coverage,
    validation: report.validation,
    promptInjection: report.promptInjection,
  };
}

/** Runs the analysis on the submitted log, with the report in the given language, and stores it. */
export async function analyzeAndSave(
  input: CreateAnalysisBody,
  submitter: Submitter,
  language: Language,
) {
  const { report } = await analyzeLog(input.rawLog, language);

  return createAnalysis({
    source: input.source,
    fileName: input.fileName,
    rawLog: input.rawLog,
    owner: submitter.owner,
    clientHash: submitter.clientHash,
    title: report.title,
    severity: report.severity,
    category: report.category,
    report: pickStoredReport(report),
  });
}
