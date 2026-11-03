import { doubleQuoted, neutralizeTemplates } from './escape';
import type { AlertSettings } from './settings';
import { alertSeverity } from './vocabulary';

/** Alertmanager alerting rule on a counter that a log exporter (mtail, grok_exporter...) fills. */
export function buildPrometheusRule(settings: AlertSettings): string {
  const { pattern, threshold, windowMinutes, severity } = settings;
  const matcher = 'pattern=' + doubleQuoted(pattern);
  const expression = `sum(increase(log_matches_total{${matcher}}[${windowMinutes}m])) > ${threshold}`;
  const summary = `Log pattern seen more than ${threshold} times in ${windowMinutes} minutes: ${neutralizeTemplates(pattern)}`;
  return [
    '# log_matches_total is the counter your log exporter increments for this pattern.',
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
