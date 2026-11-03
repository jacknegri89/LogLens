import { shellSingleQuoted } from './escape';
import type { AlertSettings } from './settings';

function settingsLines({ pattern, threshold, windowMinutes, logFile }: AlertSettings): string[] {
  return [
    '#!/usr/bin/env bash',
    `# Cron: */${windowMinutes} * * * * /usr/local/bin/loglens-alert.sh`,
    'set -euo pipefail',
    '',
    `LOG_FILE=${shellSingleQuoted(logFile)}`,
    `PATTERN=${shellSingleQuoted(pattern)}`,
    `THRESHOLD=${threshold}`,
    "WEBHOOK_URL='https://hooks.example.com/REPLACE_ME'",
    'STATE_FILE="${TMPDIR:-/tmp}/loglens-alert.offset"',
  ];
}

function countLines(): string[] {
  return [
    'size=$(wc -c < "$LOG_FILE")',
    'offset=$(cat "$STATE_FILE" 2>/dev/null || echo 0)',
    'if [ "$offset" -gt "$size" ]; then offset=0; fi # the log was rotated',
    'count=$(tail -c +"$((offset + 1))" "$LOG_FILE" | grep -c -F -e "$PATTERN" || true)',
    'echo "$size" > "$STATE_FILE"',
  ];
}

function notifyLines(windowMinutes: number): string[] {
  return [
    'if [ "$count" -gt "$THRESHOLD" ]; then',
    "  curl -fsS -X POST -H 'Content-Type: application/json' \\",
    `    -d "{\\"text\\":\\"LogLens: pattern seen $count times in the last ${windowMinutes} minutes\\"}" \\`,
    '    "$WEBHOOK_URL"',
    '  # Or by mail: echo "Pattern seen $count times" | mail -s "LogLens alert" you@example.com',
    'fi',
  ];
}

/**
 * A Bash script for cron. It counts the matching lines added since its previous run, so run it
 * every `windowMinutes` minutes. The message sent to the webhook never contains the pattern.
 */
export function buildCronScript(settings: AlertSettings): string {
  const lines = [
    ...settingsLines(settings),
    '',
    ...countLines(),
    '',
    ...notifyLines(settings.windowMinutes),
  ];
  return lines.join('\n');
}
