import { randomBytes } from 'node:crypto';

import { prisma } from '../db/prisma';
import type { Analysis } from '../generated/prisma/client';
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
 * What callers get back: the database row with `report` parsed from its JSON string, and
 * without `owner` and `clientHash`, which identify a visitor and never leave the server.
 */
export interface AnalysisRecord extends Omit<Analysis, 'report' | 'owner' | 'clientHash'> {
  report: AnalysisReport;
}

/** Turn a raw DB row into our richer record (parse the JSON `report`). */
function toRecord(row: Analysis): AnalysisRecord {
  const { owner: _owner, clientHash: _clientHash, ...visible } = row;
  return { ...visible, report: JSON.parse(row.report) as AnalysisReport };
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

/** Removes analyses created before the retention period, for every visitor. Returns how many were deleted. */
export async function deleteAnalysesOlderThan(days: number): Promise<number> {
  const result = await prisma.analysis.deleteMany({
    where: { createdAt: { lt: new Date(Date.now() - days * ONE_DAY_MS) } },
  });
  return result.count;
}

/** Removes one analysis of this visitor. Returns false when it is not theirs or does not exist. */
export async function deleteAnalysisById(id: string, owner: string): Promise<boolean> {
  const result = await prisma.analysis.deleteMany({ where: { id, owner } });
  return result.count > 0;
}

export async function getAnalysisById(id: string, owner: string): Promise<AnalysisRecord | null> {
  const row = await prisma.analysis.findFirst({ where: { id, owner } });
  if (!row) {
    return null;
  }
  return toRecord(row);
}

/** Records the visitor's verdict. Returns false when the analysis is not theirs or does not exist. */
export async function setFeedback(
  id: string,
  owner: string,
  helpful: boolean | null,
): Promise<boolean> {
  const result = await prisma.analysis.updateMany({ where: { id, owner }, data: { helpful } });
  return result.count > 0;
}

/**
 * Creates the secret link of an analysis, or returns the existing one. Returns null when the
 * analysis is not theirs or does not exist.
 */
export async function createShareToken(id: string, owner: string): Promise<string | null> {
  const row = await findShareToken(id, owner);
  if (!row) {
    return null;
  }
  if (row.shareToken) {
    return row.shareToken;
  }
  const shareToken = randomBytes(24).toString('base64url');
  // Only an analysis without a link takes this token: a request that lost the race keeps the winner's.
  await prisma.analysis.updateMany({
    where: { id, owner, shareToken: null },
    data: { shareToken },
  });
  const saved = await findShareToken(id, owner);
  return saved?.shareToken ?? null;
}

function findShareToken(id: string, owner: string) {
  return prisma.analysis.findFirst({ where: { id, owner }, select: { shareToken: true } });
}

/** Removes the secret link, so the report is no longer reachable from it. */
export async function revokeShareToken(id: string, owner: string): Promise<boolean> {
  const result = await prisma.analysis.updateMany({
    where: { id, owner },
    data: { shareToken: null },
  });
  return result.count > 0;
}

/** The read-only view of a shared report: no raw log and no owner, only what the report shows. */
export interface SharedAnalysis {
  id: string;
  createdAt: Date;
  title: string;
  severity: Severity;
  category: string;
  report: AnalysisReport;
}

export async function getSharedAnalysis(shareToken: string): Promise<SharedAnalysis | null> {
  const row = await prisma.analysis.findUnique({ where: { shareToken } });
  if (!row) {
    return null;
  }
  const record = toRecord(row);
  return {
    id: record.id,
    createdAt: record.createdAt,
    title: record.title,
    severity: record.severity as Severity,
    category: record.category,
    report: toSharedReport(record.report),
  };
}

/** Keeps the parts of the report that a reader needs, without the raw log. */
export function toSharedReport(report: AnalysisReport): AnalysisReport {
  return {
    keyLines: report.keyLines,
    causes: report.causes,
    debugSteps: report.debugSteps,
    bugReportMarkdown: report.bugReportMarkdown,
    format: report.format,
    findings: report.findings,
    overview: report.overview,
    timeline: report.timeline,
  };
}

const ONE_HOUR_MS = 60 * 60 * 1000;
const ONE_DAY_MS = 24 * ONE_HOUR_MS;

/** Saves one attempt before the AI runs. Returns its id, so a refused attempt can be removed. */
export async function recordAttempt(clientHash: string): Promise<string> {
  const attempt = await prisma.analysisAttempt.create({ data: { clientHash } });
  return attempt.id;
}

export async function removeAttempt(id: string): Promise<void> {
  await prisma.analysisAttempt.delete({ where: { id } });
}

/**
 * Removes attempts older than the limit window. They no longer count towards any limit, so
 * keeping their hashed addresses would only extend how long the data is stored.
 */
export async function deleteExpiredAttempts(): Promise<number> {
  const result = await prisma.analysisAttempt.deleteMany({
    where: { createdAt: { lt: new Date(Date.now() - ONE_HOUR_MS) } },
  });
  return result.count;
}

/** Attempts in the last hour by one client, or by everyone when no hash is given. */
export function countAttemptsInLastHour(clientHash?: string): Promise<number> {
  const since = new Date(Date.now() - ONE_HOUR_MS);
  return prisma.analysisAttempt.count({
    where: { createdAt: { gte: since }, ...(clientHash ? { clientHash } : {}) },
  });
}
