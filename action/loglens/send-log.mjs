// Sends a log file to LogLens and writes the result to the job summary.
// It has no dependencies: it runs on any GitHub runner that has Node 18 or newer.
import { readFile, appendFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const DEFAULT_MAX_CHARACTERS = 190_000;
const REQUEST_TIMEOUT_MS = 60_000;
const SEVERITY_ORDER = ['informational', 'low', 'medium', 'high', 'critical'];

/** The last `maxCharacters` of the log, starting at a line break, so the newest lines are kept. */
export function tailOfLog(text, maxCharacters = DEFAULT_MAX_CHARACTERS) {
  if (text.length <= maxCharacters) return text;
  const kept = text.slice(text.length - maxCharacters);
  const firstLineBreak = kept.indexOf('\n');
  return firstLineBreak === -1 ? kept : kept.slice(firstLineBreak + 1);
}

/** True when the severity is at or above the threshold. `none` never fails the job. */
export function isAtOrAbove(severity, threshold) {
  if (threshold === 'none') return false;
  return SEVERITY_ORDER.indexOf(severity) >= SEVERITY_ORDER.indexOf(threshold);
}

/** The Markdown block written to the job summary. It never contains the log itself. */
export function summaryMarkdown(result) {
  return [
    '## LogLens report',
    '',
    `**Severity:** ${result.severity}`,
    `**Category:** ${result.category}`,
    `**Title:** ${result.title}`,
    `**Analysis id:** \`${result.id}\``,
    '',
  ].join('\n');
}

/** Posts the log and returns the analysis summary. Errors never include the token. */
export async function sendLog({ endpoint, token, rawLog, fetchImplementation = fetch }) {
  const response = await fetchImplementation(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ rawLog }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`LogLens answered ${response.status}: ${body.slice(0, 200)}`);
  }
  return response.json();
}

async function main() {
  const endpoint = process.env.LOGLENS_ENDPOINT || 'https://loglens-demo.vercel.app/api/ingest';
  const token = process.env.LOGLENS_TOKEN || '';
  const logPath = process.env.LOG_PATH || '';
  const threshold = process.env.FAIL_ON_SEVERITY || 'none';
  const maxCharacters = Number(process.env.MAX_CHARACTERS) || DEFAULT_MAX_CHARACTERS;

  if (!token) throw new Error('Set the loglens-token input (a repository secret).');
  if (!logPath) throw new Error('Set the log-path input.');

  const rawLog = tailOfLog(await readFile(logPath, 'utf8'), maxCharacters);
  if (rawLog.trim() === '') throw new Error(`The log file ${logPath} is empty.`);

  const result = await sendLog({ endpoint, token, rawLog });
  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (summaryPath) await appendFile(summaryPath, summaryMarkdown(result));
  const outputPath = process.env.GITHUB_OUTPUT;
  if (outputPath) {
    await appendFile(outputPath, `severity=${result.severity}\nid=${result.id}\n`);
  }
  console.log(`LogLens: ${result.severity} - ${result.title}`);

  if (isAtOrAbove(result.severity, threshold)) {
    throw new Error(`Severity ${result.severity} is at or above ${threshold}.`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
