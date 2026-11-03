import { doubleQuoted, neutralizeTemplates } from './escape';
import type { AlertSettings } from './settings';
import { alertSeverity } from './vocabulary';

/** Grafana Loki ruler rule: a LogQL count of the lines that contain the pattern. */
export function buildLokiRule(settings: AlertSettings): string {
  const { pattern, threshold, windowMinutes, severity, appName } = settings;
  const stream = `{app=${doubleQuoted(appName)}} |= ${doubleQuoted(pattern)}`;
  const expression = `sum(count_over_time(${stream} [${windowMinutes}m])) > ${threshold}`;
  const summary = `Log line seen more than ${threshold} times in ${windowMinutes} minutes: ${neutralizeTemplates(pattern)}`;
  return [
    'groups:',
    '  - name: loglens',
    '    rules:',
    '      - alert: LogLensRepeatedPattern',
    `        expr: ${doubleQuoted(expression)}`,
    '        for: 1m',
    '        labels:',
    `          severity: ${alertSeverity(severity)}`,
    '        annotations:',
    `          summary: ${doubleQuoted(summary)}`,
  ].join('\n');
}
