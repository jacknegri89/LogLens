import { shellSingleQuoted } from './escape';
import type { AlertSettings } from './settings';

function settingsLines({ pattern, threshold, windowMinutes, logFile }: AlertSettings): string[] {
  return [
    '#!/usr/bin/env bash',
    `# Cron: */${windowMinutes} * * * * /usr/local/bin/loglens-alert.sh`,
    '# Requires a private HOME and Linux tools: flock, stat, sha256sum, tail and curl.',
    '# The first run reads the whole log; rotate or initialize it before enabling this alert.',
    'set -euo pipefail',
    '',
    `LOG_FILE=${shellSingleQuoted(logFile)}`,
    `PATTERN=${shellSingleQuoted(pattern)}`,
    `THRESHOLD=${threshold}`,
    `WINDOW_MINUTES=${windowMinutes}`,
    "WEBHOOK_URL='https://hooks.example.com/REPLACE_ME'",
    'umask 077',
    'STATE_DIR="${HOME:?HOME must point to a private home directory}/.loglens-alert"',
    'if [ -L "$STATE_DIR" ]; then',
    '  echo "State directory cannot be a symlink" >&2',
    '  exit 1',
    'fi',
    'mkdir -p -m 700 -- "$STATE_DIR"',
    'if [ "$(stat -c %u "$STATE_DIR")" != "$(id -u)" ] || [ "$(stat -c %a "$STATE_DIR")" != 700 ]; then',
    '  echo "State directory must be owned by this user and have mode 700" >&2',
    '  exit 1',
    'fi',
    'STATE_KEY=$(printf \'%s\\0%s\\0%s\\0%s\\0%s\\0%s\' "$0" "$LOG_FILE" "$PATTERN" "$THRESHOLD" "$WINDOW_MINUTES" "$WEBHOOK_URL" | sha256sum | cut -d \' \' -f 1)',
    'STATE_FILE="$STATE_DIR/$STATE_KEY.offset"',
    'LOCK_FILE="$STATE_DIR/$STATE_KEY.lock"',
    'if [ -L "$STATE_FILE" ]; then',
    '  echo "State file cannot be a symlink" >&2',
    '  exit 1',
    'fi',
    'if [ -L "$LOCK_FILE" ]; then',
    '  echo "Lock file cannot be a symlink" >&2',
    '  exit 1',
    'fi',
    'exec 9>>"$LOCK_FILE"',
    'if ! flock -n 9; then',
    '  exit 0',
    'fi',
  ];
}

function countLines(): string[] {
  return [
    'size=$(wc -c < "$LOG_FILE")',
    'offset=$(cat "$STATE_FILE" 2>/dev/null || echo 0)',
    '# A smaller file means the log was rotated.',
    'if [ "$offset" -gt "$size" ]; then',
    '  offset=0',
    'fi',
    'count=$(tail -c +"$((offset + 1))" "$LOG_FILE" | grep -c -F -e "$PATTERN" || true)',
  ];
}

function notifyLines(): string[] {
  return [
    'if [ "$count" -gt "$THRESHOLD" ]; then',
    "  curl -fsS --connect-timeout 5 --max-time 10 -X POST -H 'Content-Type: application/json' \\",
    '    -d "{\\"text\\":\\"LogLens: pattern seen $count times since the previous check\\"}" \\',
    '    "$WEBHOOK_URL"',
    '  # Or by mail: echo "Pattern seen $count times" | mail -s "LogLens alert" you@example.com',
    'fi',
    'echo "$size" > "$STATE_FILE"',
  ];
}

/**
 * A Bash script for cron. It counts the matching lines added since its previous run, so run it
 * every `windowMinutes` minutes. The message sent to the webhook never contains the pattern.
 */
export function buildCronScript(settings: AlertSettings): string {
  const lines = [...settingsLines(settings), '', ...countLines(), '', ...notifyLines()];
  return lines.join('\n');
}
