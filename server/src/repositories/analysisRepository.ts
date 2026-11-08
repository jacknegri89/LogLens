import { randomBytes } from 'node:crypto';

import { sanitizeDeep, sanitizeText } from '../analysis/sanitizeReport';
import { parseStoredReport } from '../analysis/storedReport';
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
  return { ...visible, report: parseStoredReport(row.report) };
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
  const row = await prisma.analysis.findUnique({
    where: { shareToken },
    select: {
      id: true,
      createdAt: true,
      title: true,
      severity: true,
      category: true,
      report: true,
    },
  });
  if (!row) {
    return null;
  }
  return {
    id: row.id,
    createdAt: row.createdAt,
    title: sanitizeText(row.title),
    severity: row.severity as Severity,
    category: sanitizeText(row.category),
    report: toSharedReport(parseStoredReport(row.report)),
  };
}

/**
 * What a reader of the shared link may see: the whole report (incidents with their causes and
 * certainty, coverage, validation, findings, timeline) with every secret and e-mail address hidden,
 * and never the raw log. The cleaning happens when the link is opened, so reports saved before this
 * existed are cleaned too.
 */
export function toSharedReport(report: AnalysisReport): AnalysisReport {
  const visible: AnalysisReport = {
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
  return sanitizeDeep(visible);
}

const ONE_HOUR_MS = 60 * 60 * 1000;
const ONE_DAY_MS = 24 * ONE_HOUR_MS;

/** Which limit, if any, stopped an attempt. */
export type AttemptDecision = 'allowed' | 'client-limit' | 'global-limit';

export interface AttemptLimits {
  /** Attempts one client may make per hour; 0 turns the limit off. */
  perClientPerHour: number;
  /** Attempts everybody together may make per hour; 0 turns the limit off. */
  globalPerHour: number;
}

/** The key of the advisory lock that makes reservations take turns (any fixed number will do). */
const ATTEMPT_LOCK_KEY = 727_001;
const TRANSACTION_MAX_WAIT_MS = 5000;
const TRANSACTION_TIMEOUT_MS = 10_000;

/**
 * Decides whether a client may start an analysis and, if so, saves the attempt: all in ONE
 * transaction that first takes a PostgreSQL advisory lock. Requests that arrive together queue up
 * on the lock, so each one counts the attempts of the ones before it and no more: exactly the
 * allowed number gets through, and a refused attempt is never written (so it can never be counted
 * against anybody else). The lock is released when the transaction ends, and works through a
 * transaction-mode pooler such as the one in front of Neon.
 * Attempts older than the window are removed here too, so the hashed addresses do not pile up.
 */
export function tryReserveAttempt(
  clientHash: string,
  limits: AttemptLimits,
): Promise<AttemptDecision> {
  return prisma.$transaction(
    async (transaction) => {
      await transaction.$executeRaw`SELECT pg_advisory_xact_lock(${ATTEMPT_LOCK_KEY})`;
      const since = new Date(Date.now() - ONE_HOUR_MS);
      await transaction.analysisAttempt.deleteMany({ where: { createdAt: { lt: since } } });
      if (limits.perClientPerHour > 0) {
        const used = await transaction.analysisAttempt.count({
          where: { clientHash, createdAt: { gte: since } },
        });
        if (used >= limits.perClientPerHour) {
          return 'client-limit';
        }
      }
      if (limits.globalPerHour > 0) {
        const used = await transaction.analysisAttempt.count({
          where: { createdAt: { gte: since } },
        });
        if (used >= limits.globalPerHour) {
          return 'global-limit';
        }
      }
      await transaction.analysisAttempt.create({ data: { clientHash } });
      return 'allowed';
    },
    { maxWait: TRANSACTION_MAX_WAIT_MS, timeout: TRANSACTION_TIMEOUT_MS },
  );
}
