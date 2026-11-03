import { FORMAT_LABEL } from '../content/formatLabels';

const MAX_SAMPLE_LINES = 30;
/** Share of the sampled lines that must look alike for a line-based format. */
const DOMINANT_SHARE = 0.5;

type LinesTest = (lines: string[]) => boolean;

/** A format that shows in a single telltale line, such as a traceback header. */
function anyLine(pattern: RegExp): LinesTest {
  return (lines) => lines.some((line) => pattern.test(line));
}

/** A format where every entry has the same shape, so most of the sample must match. */
function mostLines(pattern: RegExp): LinesTest {
  return (lines) =>
    countMatching(lines, (line) => pattern.test(line)) / lines.length >= DOMINANT_SHARE;
}

function countMatching(lines: string[], isMatch: (line: string) => boolean): number {
  return lines.filter(isMatch).length;
}

function isJsonObject(line: string): boolean {
  const text = line.trim();
  if (!text.startsWith('{') || !text.endsWith('}')) return false;
  try {
    const value: unknown = JSON.parse(text);
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  } catch {
    return false;
  }
}

const isJsonLines: LinesTest = (lines) =>
  countMatching(lines, isJsonObject) / lines.length >= DOMINANT_SHARE;

const WINDOWS_EVENT = /^\s*(?:Log Name|Event ID|Task Category):|<Event xmlns=|\bEventID\b/;
const PYTHON_TRACEBACK = /^\s*Traceback \(most recent call last\):|^\s+File "[^"]+", line \d+/;
const JAVA_STACK_TRACE =
  /^\s+at [\w$.<>]+\([\w$]+\.(?:java|kt|scala):\d+\)|^Exception in thread "|^Caused by: [\w$]+(?:\.[\w$]+)+/;
const NODE_ERROR =
  /^\s+at .*\(node:internal[^)]*\)|^\s+at (?:.+ \()?[^\s()]+\.(?:[cm]?js|ts):\d+:\d+\)?$|UnhandledPromiseRejection/;
// Docker timestamps carry nanoseconds; Kubernetes klog starts with a level letter and MMDD.
const CONTAINER_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6,9}Z /;
const KUBERNETES_SIGNAL =
  /\b(?:CrashLoopBackOff|ImagePullBackOff|ErrImagePull|OOMKilled|kubelet|containerd|dockerd)\b|^[EIWF]\d{4} \d{2}:\d{2}:\d{2}\.\d+\s+\d+ \S+:\d+\]|Cannot connect to the Docker daemon|Error response from daemon/;
// PostgreSQL writes "LOG:  message" with two spaces, usually after a "[pid]" in the prefix.
const POSTGRES_LINE =
  /\[\d+\]\s+(?:LOG|ERROR|FATAL|PANIC|WARNING|STATEMENT|DETAIL|HINT):\s|^\s*(?:LOG|ERROR|FATAL|PANIC|STATEMENT|DETAIL|HINT):  \S/;
const ACCESS_LOG_LINE =
  /"(?:GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS|CONNECT|TRACE) \S+ HTTP\/[\d.]+" \d{3}\b/;
const SYSLOG_LINE =
  /^(?:<\d+>)?[A-Z][a-z]{2}\s+\d{1,2} \d{2}:\d{2}:\d{2} \S+ [\w./-]+(?:\[\d+\])?: |^<\d+>\d \d{4}-\d{2}-\d{2}T/;

/** Most specific first: the first test that passes names the format. */
const FORMAT_TESTS: { label: string; test: LinesTest }[] = [
  { label: FORMAT_LABEL.jsonLines, test: isJsonLines },
  { label: FORMAT_LABEL.windowsEvent, test: anyLine(WINDOWS_EVENT) },
  { label: FORMAT_LABEL.pythonTraceback, test: anyLine(PYTHON_TRACEBACK) },
  { label: FORMAT_LABEL.javaStackTrace, test: anyLine(JAVA_STACK_TRACE) },
  { label: FORMAT_LABEL.nodeError, test: anyLine(NODE_ERROR) },
  {
    label: FORMAT_LABEL.dockerKubernetes,
    test: (lines) => mostLines(CONTAINER_TIMESTAMP)(lines) || anyLine(KUBERNETES_SIGNAL)(lines),
  },
  { label: FORMAT_LABEL.postgres, test: anyLine(POSTGRES_LINE) },
  { label: FORMAT_LABEL.accessLog, test: mostLines(ACCESS_LOG_LINE) },
  { label: FORMAT_LABEL.syslog, test: mostLines(SYSLOG_LINE) },
];

function sampleLines(rawLog: string): string[] {
  return rawLog
    .split(/\r?\n/)
    .filter((line) => line.trim() !== '')
    .slice(0, MAX_SAMPLE_LINES);
}

/**
 * Names the family a log belongs to, from its first lines. Pure and deterministic:
 * the same text always gets the same label, and "Plain text" is the answer when
 * nothing recognisable shows up.
 */
export function detectFormat(rawLog: string): string {
  const lines = sampleLines(rawLog);
  if (lines.length === 0) return FORMAT_LABEL.plainText;
  const match = FORMAT_TESTS.find(({ test }) => test(lines));
  return match?.label ?? FORMAT_LABEL.plainText;
}
