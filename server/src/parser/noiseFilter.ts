import type { NumberedLine } from './logParser';

export type NoiseKind = 'health-check' | 'probe' | 'static-asset';

/** What the filter took out, so the model can say it ignored it without ever reading it. */
export interface NoiseSummary {
  removed: number;
  byKind: Partial<Record<NoiseKind, number>>;
}

const STATIC_EXTENSIONS = 'css|js|map|png|jpe?g|gif|svg|ico|webp|avif|woff2?|ttf|eot';
const STATIC_EXTENSION = new RegExp(String.raw`\.(?:${STATIC_EXTENSIONS})$`, 'i');
const STATIC_DIRECTORY = /^\/(?:static|assets|_next\/static|public)\/.+/i;
const SUCCESSFUL_GET = /\b(?:GET|HEAD)\s+(\S+)\s+HTTP\/[\d.]+"?\s+(?:200|204|206|304)\b/gi;

const NOISE_PATTERNS: { kind: NoiseKind; pattern: RegExp }[] = [
  {
    kind: 'health-check',
    pattern:
      /\b(?:GET|HEAD)\s+\/(?:health|healthz|healthcheck|health-check|readyz?|livez?|ping|alive|heartbeat)\b/i,
  },
  {
    kind: 'probe',
    pattern: /ELB-HealthChecker|kube-probe|GoogleHC|HealthChecker|Pingdom|UptimeRobot|StatusCake/i,
  },
];

/** A routine line is still kept when it reports a failure: a failing health check is news. */
export const FAILURE_SIGNAL =
  /\b(?:error|exception|fatal|panic|fail(?:ed|ure)?|timeout|timed out|refused|denied)\b|"\s*[45]\d{2}\s|\bstatus[=:\s]+[45]\d{2}\b/i;

const TRACE_ID = /\b(?:trace|request|req|correlation)[_-]?id[=:\s"']+([\w-]{6,})/gi;

/** The kind of routine traffic a line is (health check, probe, static asset), or null for a line that is not routine. */
export function noiseKindOf(content: string): NoiseKind | null {
  const routine = NOISE_PATTERNS.find(({ pattern }) => pattern.test(content));
  if (routine) {
    return routine.kind;
  }
  for (const request of content.matchAll(SUCCESSFUL_GET)) {
    const url = request[1];
    const path = url.split('?', 1)[0];
    if (STATIC_DIRECTORY.test(url) || STATIC_EXTENSION.test(path)) {
      return 'static-asset';
    }
  }
  return null;
}

function traceIdsOf(content: string): string[] {
  return [...content.matchAll(TRACE_ID)].map((match) => match[1]);
}

/** The trace ids that appear on a failing line: a routine line with one of them is part of that error trace. */
function failingTraceIds(lines: NumberedLine[]): Set<string> {
  const ids = new Set<string>();
  for (const { content } of lines) {
    if (FAILURE_SIGNAL.test(content)) {
      traceIdsOf(content).forEach((id) => ids.add(id));
    }
  }
  return ids;
}

function isRoutine(content: string, failingIds: Set<string>): NoiseKind | null {
  const kind = noiseKindOf(content);
  if (!kind || FAILURE_SIGNAL.test(content)) {
    return null;
  }
  if (traceIdsOf(content).some((id) => failingIds.has(id))) {
    return null;
  }
  return kind;
}

/**
 * Takes the routine lines out before anything is sent to a model: health checks, load balancer
 * probes and static assets answered normally. They only distract it from the lines that matter.
 */
export function separateNoise(lines: NumberedLine[]): {
  kept: NumberedLine[];
  noise: NoiseSummary;
} {
  const failingIds = failingTraceIds(lines);
  const noise: NoiseSummary = { removed: 0, byKind: {} };
  const kept: NumberedLine[] = [];
  for (const line of lines) {
    const kind = isRoutine(line.content, failingIds);
    if (kind === null) {
      kept.push(line);
      continue;
    }
    noise.removed += 1;
    noise.byKind[kind] = (noise.byKind[kind] ?? 0) + 1;
  }
  return { kept, noise };
}
