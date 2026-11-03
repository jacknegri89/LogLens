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
  owner: string;
  clientHash: string;
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
      owner: input.owner,
      clientHash: input.clientHash,
    },
  });
  return toRecord(row);
}

/** A lightweight row for the history list: no rawLog, no full report. */
export interface AnalysisSummary {
  id: string;
  createdAt: Date;
  source: string;
  title: string;
  severity: Severity;
  category: string;
}

/**
 * Most recent first, but only the columns the history page needs. Selecting
 * fewer columns keeps the response small and fast.
 */
export async function listAnalysisSummaries(owner: string): Promise<AnalysisSummary[]> {
  const rows = await prisma.analysis.findMany({
    where: { owner },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      createdAt: true,
      source: true,
      title: true,
      severity: true,
      category: true,
    },
  });
  return rows.map((row) => ({ ...row, severity: row.severity as Severity }));
}

/** Removes every analysis of one visitor. Returns how many rows were deleted. */
export async function deleteAnalysesByOwner(owner: string): Promise<number> {
  const result = await prisma.analysis.deleteMany({ where: { owner } });
  return result.count;
}

export async function getAnalysisById(id: string, owner: string): Promise<AnalysisRecord | null> {
  const row = await prisma.analysis.findFirst({ where: { id, owner } });
  if (!row) {
    return null;
  }
  return toRecord(row);
}

const ONE_HOUR_MS = 60 * 60 * 1000;

/** Saves one attempt before the AI runs. Returns its id, so a refused attempt can be removed. */
export async function recordAttempt(clientHash: string): Promise<string> {
  const attempt = await prisma.analysisAttempt.create({ data: { clientHash } });
  return attempt.id;
}

export async function removeAttempt(id: string): Promise<void> {
  await prisma.analysisAttempt.delete({ where: { id } });
}

/** Attempts in the last hour by one client, or by everyone when no hash is given. */
export function countAttemptsInLastHour(clientHash?: string): Promise<number> {
  const since = new Date(Date.now() - ONE_HOUR_MS);
  return prisma.analysisAttempt.count({
    where: { createdAt: { gte: since }, ...(clientHash ? { clientHash } : {}) },
  });
}
