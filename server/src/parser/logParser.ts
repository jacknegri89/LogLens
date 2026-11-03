import { ATTACK_SIGNATURE } from '../content/rules';
import type { Severity } from '../types/report';

/**
 * The log parser: a PURE function that takes raw log text and pulls out the
 * lines worth analyzing. "Pure" means no I/O and no side effects — same input
 * always gives the same output — which makes it trivial to unit-test.
 *
 * Why parse before calling the AI? Logs can be huge. Sending only the relevant
 * lines keeps the AI prompt small, fast and cheaper, and focuses the model on
 * what matters.
 */

/** Why a line was kept. `context` is used only for the no-match fallback. */
export type LineCategory =
  | 'error'
  | 'warning'
  | 'exception'
  | 'failure'
  | 'timeout'
  | 'stack'
  | 'attack'
  | 'server-error'
  | 'client-error'
  | 'context';

export interface ParsedLine {
  /** 1-based line number in the original log. */
  lineNumber: number;
  content: string;
  category: LineCategory;
}

export interface ParseResult {
  /** Number of non-empty-aware total lines in the input. */
  totalLines: number;
  /** How many lines matched a keyword/stack pattern. */
  matchedCount: number;
  /** The lines we kept, in original order. */
  relevantLines: ParsedLine[];
  /** Relevant lines joined into a compact text, ready for the AI prompt. */
  excerpt: string;
  /** A rough severity guess from what matched (the AI makes the final call). */
  severityHint: Severity;
  /** True if we hit the line/char limits and cut the excerpt short. */
  truncated: boolean;
}

export interface ParseOptions {
  /** Max relevant lines to keep. Default 100. */
  maxLines?: number;
  /** Max excerpt length in characters. Default 6000. */
  maxChars?: number;
  /** Max length of a single line before it's truncated. Default 1000. */
  maxLineLength?: number;
  /** When nothing matches, how many trailing lines to keep. Default 20. */
  fallbackTailLines?: number;
}

/**
 * Ordered keyword matchers. The FIRST one that matches a line wins, so more
 * specific/severe categories are listed first.
 */
const MATCHERS: { category: Exclude<LineCategory, 'context'>; pattern: RegExp }[] = [
  {
    category: 'stack',
    // "    at fn (file:line:col)", Python "  File "app.py", line 12", "Caused by: ..."
    pattern:
      /^\s*at\s+|^\s*File "[^"]+", line \d+|^\s*Traceback \(most recent call last\)|^\s*caused by:/i,
  },
  { category: 'attack', pattern: ATTACK_SIGNATURE },
  { category: 'exception', pattern: /exception/i },
  // Whole word, so "errors_count=0" is not an error; "TypeError" and "KeyError" still match.
  { category: 'error', pattern: /\berror\b|[a-z]Error\b|\bfatal\b|\bpanic\b/i },
  // Syslog and log4j levels are written in capitals; lowercase "err" or "crit" in prose is not a level.
  { category: 'error', pattern: /\b(?:ERR|CRIT|CRITICAL|ALERT|EMERG)\b/ },
  { category: 'server-error', pattern: /"\s5\d{2}\s|\bstatus[=:\s]+5\d{2}\b/i }, // access log: "GET / HTTP/1.1" 502
  { category: 'timeout', pattern: /\btimeout\b|timed out/i },
  {
    category: 'failure',
    pattern: /\bfail(?:ed|ure|s)?\b|oomkilled|out of memory|\bkilled\b|segfault|core dumped/i,
  },
  { category: 'client-error', pattern: /"\s4\d{2}\s|\bstatus[=:\s]+4\d{2}\b/i },
  { category: 'warning', pattern: /\bwarn(?:ing)?\b/i },
];

function classify(line: string): Exclude<LineCategory, 'context'> | null {
  for (const matcher of MATCHERS) {
    if (matcher.pattern.test(line)) {
      return matcher.category;
    }
  }
  return null;
}

function truncate(text: string, max: number): string {
  if (text.length > max) {
    return `${text.slice(0, max)} ... (truncated)`;
  }
  return text;
}

function computeSeverity(categories: Set<LineCategory>): Severity {
  const high = ['error', 'exception', 'attack', 'server-error'] as const;
  if (high.some((category) => categories.has(category))) return 'high';
  if (categories.has('failure') || categories.has('timeout')) return 'medium';
  return 'low';
}

interface NumberedLine {
  content: string;
  lineNumber: number;
}

export function parseLog(raw: string, options: ParseOptions = {}): ParseResult {
  const { maxLines = 100, maxChars = 6000, maxLineLength = 1000, fallbackTailLines = 20 } = options;

  const nonEmpty = nonEmptyLines(raw);
  const totalLines = nonEmpty.length;

  // Keep every matching line. If none match, keep the tail instead: the actual failure
  // is often the last thing printed.
  const matched = keepMatchingLines(nonEmpty, maxLineLength);
  const matchedCount = matched.length;
  const candidates =
    matchedCount === 0 && totalLines > 0
      ? tailLines(nonEmpty, fallbackTailLines, maxLineLength)
      : matched;

  const { lines: relevant, truncated: lineCapped } = capLines(candidates, maxLines);
  const { excerpt, truncated: charCapped } = capExcerpt(relevant, maxChars);
  const severityHint = computeSeverity(new Set(relevant.map((line) => line.category)));

  return {
    totalLines,
    matchedCount,
    relevantLines: relevant,
    excerpt,
    severityHint,
    truncated: lineCapped || charCapped,
  };
}

function nonEmptyLines(raw: string): NumberedLine[] {
  return raw
    .split(/\r?\n/)
    .map((content, index) => ({ content: content.replace(/\s+$/, ''), lineNumber: index + 1 }))
    .filter((line) => line.content.trim() !== '');
}

function keepMatchingLines(lines: NumberedLine[], maxLineLength: number): ParsedLine[] {
  const matched: ParsedLine[] = [];
  for (const line of lines) {
    const category = classify(line.content);
    if (category) {
      matched.push({
        lineNumber: line.lineNumber,
        content: truncate(line.content, maxLineLength),
        category,
      });
    }
  }
  return matched;
}

function tailLines(lines: NumberedLine[], count: number, maxLineLength: number): ParsedLine[] {
  return lines.slice(-count).map((line) => ({
    lineNumber: line.lineNumber,
    content: truncate(line.content, maxLineLength),
    category: 'context' as const,
  }));
}

/**
 * When there are too many lines we keep the start and the end, not only the start:
 * the root cause ("Caused by", the last traceback frame) is usually at the bottom.
 */
function capLines(
  lines: ParsedLine[],
  maxLines: number,
): { lines: ParsedLine[]; truncated: boolean } {
  if (lines.length <= maxLines) return { lines, truncated: false };
  const headCount = Math.ceil(maxLines / 2);
  const tailCount = maxLines - headCount;
  const tail = tailCount > 0 ? lines.slice(-tailCount) : [];
  return { lines: [...lines.slice(0, headCount), ...tail], truncated: true };
}

const OMITTED_MARKER = '\n... (lines omitted) ...\n';

function capExcerpt(
  lines: ParsedLine[],
  maxChars: number,
): { excerpt: string; truncated: boolean } {
  const excerpt = lines.map((line) => line.content).join('\n');
  if (excerpt.length <= maxChars) return { excerpt, truncated: false };
  const budget = Math.max(0, maxChars - OMITTED_MARKER.length);
  const headLength = Math.ceil(budget / 2);
  const tailLength = budget - headLength;
  const tail = tailLength > 0 ? excerpt.slice(-tailLength) : '';
  return { excerpt: excerpt.slice(0, headLength) + OMITTED_MARKER + tail, truncated: true };
}
