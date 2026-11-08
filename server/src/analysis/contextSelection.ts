import type { NormalizedLogEvent } from '../parser/normalizedEvent';
import { identifiersOf } from '../parser/normalizedEvent';
import type { NormalizedLog } from '../parser/normalizeLog';
import type { NoiseKind } from '../parser/noiseFilter';
import { splitIntoChunks } from './chunking';
import {
  classifyEvent,
  type Anomaly,
  type EventClass,
  type SignificantKind,
} from './eventClassification';

/**
 * Chooses the events an analysis reads. It replaces "keep the lines that contain ERROR" with a
 * selection that keeps what explains an incident: the anomalies, the events around them, the
 * deployments and configuration changes, the state transitions and every event that shares an
 * identifier with an anomaly (even a health check that carries the same trace id).
 *
 * It also says, exactly, what was NOT read: records that were never acquired, routine traffic
 * that was left out, and events cut by the budget. A partial reading is never reported as complete.
 */

export type SelectionReason = 'anomaly' | 'change' | 'state' | 'shared-identifier' | 'window';

export interface SelectedEvent {
  event: NormalizedLogEvent;
  /** Position of the event in the file, 0-based. */
  index: number;
  reasons: SelectionReason[];
  anomaly: Anomaly | null;
  significant: SignificantKind | null;
}

export interface SelectionOptions {
  /** Events kept before and after an anomaly. */
  windowBefore: number;
  windowAfter: number;
  /** The most events the selection keeps, and the most raw characters they may hold. */
  maxEvents: number;
  maxChars: number;
  /** Block size for the scan of a large log, and the events of overlap between blocks. */
  chunkSize: number;
  chunkOverlap: number;
  /** The most events one identifier may bring in: a session with 5,000 events is not an incident. */
  maxEventsPerIdentifier: number;
  /** The most deployment or configuration changes kept. */
  maxChangeEvents: number;
}

export const DEFAULT_SELECTION_OPTIONS: SelectionOptions = {
  windowBefore: 3,
  windowAfter: 2,
  maxEvents: 1500,
  maxChars: 400_000,
  chunkSize: 2000,
  chunkOverlap: 10,
  maxEventsPerIdentifier: 60,
  maxChangeEvents: 300,
};

/** What the selection cut or skipped, with the reason, so a report can state its own limits. */
export type CoverageLimitCode =
  | 'records-not-acquired'
  | 'cut-by-budget'
  | 'identifier-cap'
  | 'change-cap';

export interface CoverageLimit {
  code: CoverageLimitCode;
  count: number;
}

export interface AnalysisCoverage {
  /** Non-empty physical lines of the log. */
  totalLines: number;
  /** Logical records found in the log. */
  totalRecords: number;
  /** Records that were read into events. */
  acquiredEvents: number;
  /** Records that were never read because the log is larger than the reading limit. */
  notAcquired: number;
  selectedEvents: number;
  /** Routine traffic left out on purpose (health checks, probes, static assets). */
  ignoredRoutine: number;
  ignoredRoutineByKind: Partial<Record<NoiseKind, number>>;
  /** Read events that carry no sign of a problem and sit away from every anomaly. */
  notSelected: number;
  /** Relevant events that were cut because the selection budget was full. */
  cutByBudget: number;
  limits: CoverageLimit[];
  /** True only when nothing relevant was skipped: no unread records, no budget cut, no cap hit. */
  complete: boolean;
}

export interface ContextSelection {
  selected: SelectedEvent[];
  coverage: AnalysisCoverage;
}

const REASON_PRIORITY: Record<SelectionReason, number> = {
  anomaly: 70,
  change: 90,
  'shared-identifier': 60,
  state: 50,
  window: 30,
};
const HIGH_ANOMALY_BONUS = 30;

class ReasonBook {
  private readonly reasons = new Map<number, Set<SelectionReason>>();

  add(index: number, reason: SelectionReason): void {
    const found = this.reasons.get(index) ?? new Set<SelectionReason>();
    found.add(reason);
    this.reasons.set(index, found);
  }

  has(index: number): boolean {
    return this.reasons.has(index);
  }

  reasonsOf(index: number): SelectionReason[] {
    return [...(this.reasons.get(index) ?? [])];
  }

  indexes(): number[] {
    return [...this.reasons.keys()].sort((a, b) => a - b);
  }
}

function isAnchor(eventClass: EventClass): boolean {
  return eventClass.anomaly !== null && eventClass.anomaly.strength !== 'low';
}

/** Marks the anomalies and the events around them, block by block, with the overlap between blocks. */
function markAnomaliesAndWindows(
  events: NormalizedLogEvent[],
  classes: EventClass[],
  options: SelectionOptions,
  book: ReasonBook,
): void {
  const blocks = splitIntoChunks(events, options.chunkSize, options.chunkOverlap);
  for (const block of blocks) {
    for (let index = block.coreStart; index < block.coreEnd; index += 1) {
      if (!isAnchor(classes[index])) {
        continue;
      }
      book.add(index, 'anomaly');
      markWindow(index, classes, options, book);
    }
  }
}

function markWindow(
  index: number,
  classes: EventClass[],
  options: SelectionOptions,
  book: ReasonBook,
): void {
  const first = Math.max(0, index - options.windowBefore);
  const last = Math.min(classes.length - 1, index + options.windowAfter);
  for (let neighbour = first; neighbour <= last; neighbour += 1) {
    if (neighbour !== index && classes[neighbour].routine === null) {
      book.add(neighbour, 'window');
    }
  }
}

function identifierKeys(event: NormalizedLogEvent): string[] {
  return identifiersOf(event).map((identifier) => `${identifier.kind}:${identifier.value}`);
}

/** The identifiers that anomalies carry: the strong ties between an error and the rest of its story. */
function collectAnchorIdentifiers(
  events: NormalizedLogEvent[],
  classes: EventClass[],
): Map<string, boolean> {
  const anchors = new Map<string, boolean>();
  events.forEach((event, index) => {
    if (!isAnchor(classes[index])) {
      return;
    }
    const isHigh = classes[index].anomaly?.strength === 'high';
    for (const key of identifierKeys(event)) {
      anchors.set(key, (anchors.get(key) ?? false) || isHigh);
    }
  });
  return anchors;
}

interface IdentifierResult {
  capHit: number;
}

/** Brings in every event that shares an identifier with an anomaly, up to a cap for each identifier. */
function markSharedIdentifiers(
  events: NormalizedLogEvent[],
  anchors: Map<string, boolean>,
  options: SelectionOptions,
  book: ReasonBook,
): IdentifierResult {
  const perIdentifier = new Map<string, number>();
  let capHit = 0;
  events.forEach((event, index) => {
    if (book.has(index)) {
      return;
    }
    for (const key of identifierKeys(event)) {
      if (!anchors.has(key)) {
        continue;
      }
      const count = perIdentifier.get(key) ?? 0;
      if (count >= options.maxEventsPerIdentifier) {
        capHit += 1;
        continue;
      }
      perIdentifier.set(key, count + 1);
      book.add(index, 'shared-identifier');
      return;
    }
  });
  return { capHit };
}

function markChanges(classes: EventClass[], options: SelectionOptions, book: ReasonBook): number {
  let kept = 0;
  let skipped = 0;
  classes.forEach((eventClass, index) => {
    if (eventClass.significant !== 'change') {
      return;
    }
    if (kept >= options.maxChangeEvents) {
      skipped += 1;
      return;
    }
    kept += 1;
    book.add(index, 'change');
  });
  return skipped;
}

/** State transitions are kept when they touch an incident, and when the log has few of them. */
function markStates(classes: EventClass[], book: ReasonBook): void {
  const MAX_FREE_STATES = 60;
  const stateIndexes = classes
    .map((eventClass, index) => ({ eventClass, index }))
    .filter(({ eventClass }) => eventClass.significant === 'state')
    .map(({ index }) => index);
  const keepAll = stateIndexes.length <= MAX_FREE_STATES;
  for (const index of stateIndexes) {
    if (keepAll || book.has(index)) {
      book.add(index, 'state');
    }
  }
}

function priorityOf(index: number, book: ReasonBook, classes: EventClass[]): number {
  let best = 0;
  for (const reason of book.reasonsOf(index)) {
    best = Math.max(best, REASON_PRIORITY[reason]);
  }
  if (classes[index].anomaly?.strength === 'high') {
    best += HIGH_ANOMALY_BONUS;
  }
  return best;
}

interface BudgetResult {
  kept: number[];
  cut: number;
}

/** Keeps the most useful events inside the budget, then puts them back in the order of the file. */
function applyBudget(
  indexes: number[],
  events: NormalizedLogEvent[],
  classes: EventClass[],
  book: ReasonBook,
  options: SelectionOptions,
): BudgetResult {
  const chars = (index: number) => events[index].raw.length;
  const totalChars = indexes.reduce((sum, index) => sum + chars(index), 0);
  if (indexes.length <= options.maxEvents && totalChars <= options.maxChars) {
    return { kept: indexes, cut: 0 };
  }
  const ranked = [...indexes].sort(
    (a, b) => priorityOf(b, book, classes) - priorityOf(a, book, classes) || a - b,
  );
  const kept: number[] = [];
  let usedChars = 0;
  for (const index of ranked) {
    if (kept.length >= options.maxEvents || usedChars + chars(index) > options.maxChars) {
      continue;
    }
    kept.push(index);
    usedChars += chars(index);
  }
  return { kept: kept.sort((a, b) => a - b), cut: indexes.length - kept.length };
}

function countRoutine(
  classes: EventClass[],
  selected: Set<number>,
): { total: number; byKind: Partial<Record<NoiseKind, number>> } {
  const byKind: Partial<Record<NoiseKind, number>> = {};
  let total = 0;
  classes.forEach((eventClass, index) => {
    if (eventClass.routine === null || selected.has(index)) {
      return;
    }
    total += 1;
    byKind[eventClass.routine] = (byKind[eventClass.routine] ?? 0) + 1;
  });
  return { total, byKind };
}

function buildLimits(
  notAcquired: number,
  cut: number,
  identifierCap: number,
  changeCap: number,
): CoverageLimit[] {
  const limits: CoverageLimit[] = [];
  if (notAcquired > 0) {
    limits.push({ code: 'records-not-acquired', count: notAcquired });
  }
  if (cut > 0) {
    limits.push({ code: 'cut-by-budget', count: cut });
  }
  if (identifierCap > 0) {
    limits.push({ code: 'identifier-cap', count: identifierCap });
  }
  if (changeCap > 0) {
    limits.push({ code: 'change-cap', count: changeCap });
  }
  return limits;
}

/**
 * Selects the events of a normalised log that an analysis must read, in the order of the file,
 * and reports what was left out. Pure and deterministic.
 */
export function selectContext(
  log: NormalizedLog,
  options: SelectionOptions = DEFAULT_SELECTION_OPTIONS,
): ContextSelection {
  const { events } = log;
  const classes = events.map(classifyEvent);
  const book = new ReasonBook();

  markAnomaliesAndWindows(events, classes, options, book);
  const anchors = collectAnchorIdentifiers(events, classes);
  const identifiers = markSharedIdentifiers(events, anchors, options, book);
  const changeCap = markChanges(classes, options, book);
  markStates(classes, book);

  const { kept, cut } = applyBudget(book.indexes(), events, classes, book, options);
  const keptSet = new Set(kept);
  const routine = countRoutine(classes, keptSet);
  const limits = buildLimits(log.notAcquiredRecords, cut, identifiers.capHit, changeCap);
  const selected = kept.map(
    (index): SelectedEvent => ({
      event: events[index],
      index,
      reasons: book.reasonsOf(index),
      anomaly: classes[index].anomaly,
      significant: classes[index].significant,
    }),
  );
  const notSelected = events.length - kept.length - routine.total - cut;

  return {
    selected,
    coverage: {
      totalLines: log.totalLines,
      totalRecords: log.totalRecords,
      acquiredEvents: events.length,
      notAcquired: log.notAcquiredRecords,
      selectedEvents: kept.length,
      ignoredRoutine: routine.total,
      ignoredRoutineByKind: routine.byKind,
      notSelected: Math.max(0, notSelected),
      cutByBudget: cut,
      limits,
      complete: limits.length === 0,
    },
  };
}
