import { buildCronScript } from './cron';
import { buildDatadogMonitor } from './datadog';
import { buildLokiRule } from './loki';
import { buildPrometheusRule } from './prometheus';
import { buildSentryRule } from './sentry';
import { normalizeSettings, type AlertSettings, type AlertTargetId } from './settings';

const BUILDERS: Record<AlertTargetId, (settings: AlertSettings) => string> = {
  prometheus: buildPrometheusRule,
  datadog: buildDatadogMonitor,
  loki: buildLokiRule,
  sentry: buildSentryRule,
  cron: buildCronScript,
};

/** The alert for one target. The settings are cleaned first, whatever the visitor typed. */
export function generateAlert(target: AlertTargetId, settings: AlertSettings): string {
  return BUILDERS[target](normalizeSettings(settings));
}
