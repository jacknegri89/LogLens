import type { CodeLanguageId } from './types';

/** Only the start of a very large log is read: the first stack traces already tell the language. */
const MAX_SCANNED_CHARACTERS = 100_000;

/** In tie-break order: the first language wins when two score the same. */
const LANGUAGE_PATTERNS: [CodeLanguageId, RegExp][] = [
  ['python', /File ".+\.py", line \d+|Traceback \(most recent call last\)/g],
  ['go', /goroutine \d+ \[|\.go:\d+/g],
  ['rust', /panicked at|thread '.+' panicked/g],
  ['csharp', /\bat [\w.`]+\(.*\) in .+\.cs:line \d+|System\.\w+Exception/g],
  [
    'java',
    /\bat [\w$.]+\([\w$]+\.java:\d+\)|\bat (?:com|org|java|javax)\.[\w$.]+\(|Exception in thread/g,
  ],
  ['php', /PHP (?:Fatal error|Warning|Notice|Parse error)|\.php(?::\d+| on line \d+)/g],
  ['ruby', /\.rb:\d+:in [`']/g],
  ['node', /\bat .+\(?.*\.(?:js|mjs|cjs|ts|tsx|jsx):\d+:\d+\)?|node:internal/g],
];

function countMatches(text: string, pattern: RegExp): number {
  return text.match(pattern)?.length ?? 0;
}

/** The programming language the log's stack traces point to, or null when none is recognisable. */
export function detectCodeLanguage(rawLog: string): CodeLanguageId | null {
  const text = rawLog.slice(0, MAX_SCANNED_CHARACTERS);
  let best: CodeLanguageId | null = null;
  let bestScore = 0;
  for (const [language, pattern] of LANGUAGE_PATTERNS) {
    const score = countMatches(text, pattern);
    if (score > bestScore) {
      best = language;
      bestScore = score;
    }
  }
  return best;
}
