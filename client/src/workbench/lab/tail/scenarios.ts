export type ScenarioKind = 'paymentTimeouts' | 'poolExhaustion' | 'memoryLeak';

export const SCENARIO_KINDS: readonly ScenarioKind[] = [
  'paymentTimeouts',
  'poolExhaustion',
  'memoryLeak',
];

/** The most lines one stream may add to the log. */
export const MAX_TAIL_LINES = 3000;
export const DEFAULT_SCENARIO_LINES = 90;
const MIN_SCENARIO_LINES = 12;

export interface ScenarioOptions {
  kind: ScenarioKind;
  seed: number;
  /** Total lines including the final [FATAL] one. */
  lineCount?: number;
  /** Time of the first line, in epoch milliseconds. Fixed in tests. */
  startTimeMs?: number;
}

type Level = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
type Random = () => number;

/** A small seeded generator (mulberry32): the same seed always gives the same stream. */
export function createRandom(seed: number): Random {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = Math.imul(state ^ (state >>> 15), state | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(random: Random, items: readonly T[]): T {
  return items[Math.floor(random() * items.length)];
}

function between(random: Random, low: number, high: number): number {
  return low + Math.floor(random() * (high - low + 1));
}

function traceId(random: Random): string {
  return Array.from({ length: 8 }, () => Math.floor(random() * 16).toString(16)).join('');
}

/** What a scenario says at a moment of the stream: `progress` goes from 0 to 1. */
interface Voice {
  services: readonly string[];
  noise: (random: Random, progress: number) => string;
  warning: (random: Random, progress: number) => string;
  error: (random: Random, progress: number) => string;
  fatal: string;
}

const PAYMENT: Voice = {
  services: ['gateway', 'checkout', 'payments-api', 'stripe-client'],
  noise: (random) =>
    pick(random, [
      `POST /checkout 200 ${between(random, 40, 120)}ms`,
      `cart ${between(random, 1000, 9999)} priced, ${between(random, 1, 6)} items`,
      `payment authorized for order ${between(random, 40000, 49999)}`,
      'session refreshed for customer',
    ]),
  warning: (random, progress) =>
    `payment provider latency ${Math.round(900 + progress * 3200 + random() * 300)}ms, retrying`,
  error: (random, progress) =>
    pick(random, [
      `upstream timeout after ${between(random, 5000, 6000)}ms calling payments.example.com`,
      `charge failed for order ${between(random, 40000, 49999)}: provider timeout`,
      progress > 0.9 ? 'circuit breaker open for payments.example.com' : 'retry 3/3 exhausted',
    ]),
  fatal: 'all payment providers unreachable, checkout cannot continue, shutting down',
};

const POOL: Voice = {
  services: ['orders-api', 'db-pool', 'worker', 'reports'],
  noise: (random) =>
    pick(random, [
      `GET /orders/${between(random, 100, 9999)} 200 ${between(random, 8, 60)}ms`,
      `job ${between(random, 1000, 9999)} finished`,
      'cache warmed for dashboard queries',
      `query ok in ${between(random, 2, 25)}ms`,
    ]),
  warning: (_random, progress) =>
    `connection pool ${Math.round(70 + progress * 28)}% in use (${Math.round(7 + progress * 2.8)}/10)`,
  error: (random, progress) =>
    pick(random, [
      `timeout acquiring connection from pool (waited ${between(random, 20000, 30000)}ms)`,
      `${between(random, 12, 40 + Math.round(progress * 160))} requests waiting for a connection`,
      'cannot run query: no connection available',
    ]),
  fatal: 'database pool exhausted: 0/10 connections free, service cannot accept requests',
};

const LEAK: Voice = {
  services: ['image-worker', 'api', 'scheduler', 'gc'],
  noise: (random) =>
    pick(random, [
      `resized image ${between(random, 1000, 9999)} in ${between(random, 30, 90)}ms`,
      `job ${between(random, 1000, 9999)} queued`,
      'heartbeat ok',
      `request served in ${between(random, 5, 40)}ms`,
    ]),
  warning: (random, progress) =>
    `heap used ${Math.round(500 + progress * 440)}MB of 1024MB, GC pause ${between(random, 120, 200 + Math.round(progress * 400))}ms`,
  error: (random, progress) =>
    pick(random, [
      `heap at ${Math.min(99, Math.round(88 + progress * 11))}% after full GC, memory not released`,
      `GC overhead: ${between(random, 70, 98)}% of time spent collecting`,
      `allocation of ${between(random, 8, 64)}MB failed`,
    ]),
  fatal: 'JavaScript heap out of memory, process exiting with code 134',
};

const VOICES: Record<ScenarioKind, Voice> = {
  paymentTimeouts: PAYMENT,
  poolExhaustion: POOL,
  memoryLeak: LEAK,
};

/** Early on the stream is quiet, later it warns, and near the end it mostly errors. */
function chooseLevel(random: Random, progress: number): Level {
  const roll = random();
  if (progress < 0.4) return roll < 0.08 ? 'WARN' : roll < 0.4 ? 'DEBUG' : 'INFO';
  if (progress < 0.75)
    return roll < 0.3 ? 'WARN' : roll < 0.4 ? 'ERROR' : roll < 0.65 ? 'INFO' : 'DEBUG';
  return roll < 0.5 ? 'ERROR' : roll < 0.8 ? 'WARN' : 'INFO';
}

function messageFor(voice: Voice, level: Level, random: Random, progress: number): string {
  if (level === 'WARN') return voice.warning(random, progress);
  if (level === 'ERROR') return voice.error(random, progress);
  return voice.noise(random, progress);
}

/** The service is a key=value field because the shared parser would read the `[LEVEL]` bracket as the service. */
function formatLine(time: number, level: string, service: string, message: string, trace: string) {
  return `${new Date(time).toISOString()} [${level}] service=${service} ${message} trace_id=${trace}`;
}

export function clampLineCount(requested: number | undefined): number {
  const count = Math.floor(requested ?? DEFAULT_SCENARIO_LINES);
  return Math.min(MAX_TAIL_LINES, Math.max(MIN_SCENARIO_LINES, count));
}

const DEFAULT_START_TIME_MS = Date.UTC(2025, 5, 14, 10, 0, 0);
const MIN_GAP_MS = 150;
const MAX_GAP_MS = 400;

/**
 * A scripted stream that escalates and ends with exactly one [FATAL] line.
 * Other lines never carry that level, so the stream stops only at its own end.
 */
export function createScenario(options: ScenarioOptions): string[] {
  const random = createRandom(options.seed);
  const voice = VOICES[options.kind];
  const lineCount = clampLineCount(options.lineCount);
  let time = options.startTimeMs ?? DEFAULT_START_TIME_MS;
  const lines: string[] = [];
  for (let position = 0; position < lineCount - 1; position += 1) {
    const progress = position / (lineCount - 1);
    const level = chooseLevel(random, progress);
    const service = pick(random, voice.services);
    lines.push(
      formatLine(time, level, service, messageFor(voice, level, random, progress), traceId(random)),
    );
    time += between(random, MIN_GAP_MS, MAX_GAP_MS);
  }
  lines.push(formatLine(time, 'FATAL', voice.services[0], voice.fatal, traceId(random)));
  return lines;
}

/** The wait before the next line: 150 to 400 ms. */
export function nextDelayMs(random: Random): number {
  return between(random, MIN_GAP_MS, MAX_GAP_MS);
}
