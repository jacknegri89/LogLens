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
  'error' | 'warning' | 'exception' | 'failure' | 'timeout' | 'stack' | 'context';

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
  { category: 'stack', pattern: /^\s*at\s+/ }, // "    at fn (file:line:col)"
  { category: 'exception', pattern: /exception/i },
  { category: 'error', pattern: /error|fatal|panic/i }, // also catches TypeError, ERROR, ...
  { category: 'timeout', pattern: /\btimeout\b|timed out/i },
  {
    category: 'failure',
    pattern: /\bfail(?:ed|ure|s)?\b|oomkilled|out of memory|\bkilled\b|segfault|core dumped/i,
  },
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
  if (categories.has('error') || categories.has('exception')) return 'high';
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

function capLines(
  lines: ParsedLine[],
  maxLines: number,
): { lines: ParsedLine[]; truncated: boolean } {
  return lines.length > maxLines
    ? { lines: lines.slice(0, maxLines), truncated: true }
    : { lines, truncated: false };
}

function capExcerpt(
  lines: ParsedLine[],
  maxChars: number,
): { excerpt: string; truncated: boolean } {
  const excerpt = lines.map((line) => line.content).join('\n');
  return excerpt.length > maxChars
    ? { excerpt: excerpt.slice(0, maxChars), truncated: true }
    : { excerpt, truncated: false };
}
