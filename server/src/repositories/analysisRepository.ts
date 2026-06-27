import type { Analysis } from '@prisma/client';

import { prisma } from '../db/prisma';
import type { AnalysisReport, Severity } from '../types/report';

/**
 * Repository = the only place that talks to Prisma for `Analysis` rows.
 * Routes and services call these functions instead of using Prisma directly,
 * so our database queries live in one spot and the rest of the code stays
 * clean and easy to test.
 */

/** Everything needed to store a new analysis. */
export interface CreateAnalysisInput {
  source?: 'paste' | 'upload';
  fileName?: string | null;
  rawLog: string;
  title: string;
  severity: Severity;
  category: string;
  report: AnalysisReport;
}

/**
 * What callers get back: the database row, but with `report` already parsed
 * from its JSON string into a real object.
 */
export interface AnalysisRecord extends Omit<Analysis, 'report'> {
  report: AnalysisReport;
}

/** Turn a raw DB row into our richer record (parse the JSON `report`). */
function toRecord(row: Analysis): AnalysisRecord {
  return { ...row, report: JSON.parse(row.report) as AnalysisReport };
}

export async function createAnalysis(input: CreateAnalysisInput): Promise<AnalysisRecord> {
  const row = await prisma.analysis.create({
    data: {
      source: input.source ?? 'paste',
      fileName: input.fileName ?? null,
      rawLog: input.rawLog,
      title: input.title,
      severity: input.severity,
      category: input.category,
      report: JSON.stringify(input.report),
    },
  });
  return toRecord(row);
}

/** Most recent analyses first (for the history page). */
export async function listAnalyses(): Promise<AnalysisRecord[]> {
  const rows = await prisma.analysis.findMany({ orderBy: { createdAt: 'desc' } });
  return rows.map(toRecord);
}

export async function getAnalysisById(id: string): Promise<AnalysisRecord | null> {
  const row = await prisma.analysis.findUnique({ where: { id } });
  return row ? toRecord(row) : null;
}
