import type { FormatKey } from '../content/formatLabels';
import { formatLabel } from '../content/localized';
import { DEFAULT_LANGUAGE, type Language } from '../types/language';

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
const FORMAT_TESTS: { key: FormatKey; test: LinesTest }[] = [
  { key: 'jsonLines', test: isJsonLines },
  { key: 'windowsEvent', test: anyLine(WINDOWS_EVENT) },
  { key: 'pythonTraceback', test: anyLine(PYTHON_TRACEBACK) },
  { key: 'javaStackTrace', test: anyLine(JAVA_STACK_TRACE) },
  { key: 'nodeError', test: anyLine(NODE_ERROR) },
  {
    key: 'dockerKubernetes',
    test: (lines) => mostLines(CONTAINER_TIMESTAMP)(lines) || anyLine(KUBERNETES_SIGNAL)(lines),
  },
  { key: 'postgres', test: anyLine(POSTGRES_LINE) },
  { key: 'accessLog', test: mostLines(ACCESS_LOG_LINE) },
  { key: 'syslog', test: mostLines(SYSLOG_LINE) },
];

function sampleLines(rawLog: string): string[] {
  return rawLog
    .split(/\r?\n/)
    .filter((line) => line.trim() !== '')
    .slice(0, MAX_SAMPLE_LINES);
}

/**
 * Names the family a log belongs to, from its first lines. Pure and deterministic:
 * the same text always gets the same label (in the language asked for), and plain text is
 * the answer when nothing recognisable shows up.
 */
export function detectFormat(rawLog: string, language: Language = DEFAULT_LANGUAGE): string {
  const lines = sampleLines(rawLog);
  if (lines.length === 0) return formatLabel('plainText', language);
  const match = FORMAT_TESTS.find(({ test }) => test(lines));
  return formatLabel(match?.key ?? 'plainText', language);
}
