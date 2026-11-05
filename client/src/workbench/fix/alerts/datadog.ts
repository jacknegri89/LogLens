import { doubleQuoted, neutralizeMentions, neutralizeTemplates } from './escape';
import type { AlertSettings } from './settings';
import { datadogWindow } from './vocabulary';

function warningThreshold(threshold: number): number | null {
  const half = Math.floor(threshold / 2);
  if (half >= 1 && half < threshold) {
    return half;
  }
  return null;
}

/** Datadog log monitor, ready for POST /api/v1/monitor. The phrase is quoted, so it is literal. */
export function buildDatadogMonitor(settings: AlertSettings): string {
  const { pattern, threshold, windowMinutes } = settings;
  const search = `logs(${doubleQuoted(doubleQuoted(pattern))}).index("*").rollup("count").last("${datadogWindow(windowMinutes)}") > ${threshold}`;
  const warning = warningThreshold(threshold);
  const shown = neutralizeMentions(neutralizeTemplates(pattern));
  let thresholds: { critical: number; warning?: number } = { critical: threshold };
  if (warning !== null) {
    thresholds = { critical: threshold, warning };
  }
  const monitor = {
    name: 'LogLens: repeated log pattern',
    type: 'log alert',
    query: search,
    message: `The log pattern was seen more than ${threshold} times in ${windowMinutes} minutes: ${shown}`,
    tags: ['source:loglens'],
    options: {
      thresholds,
      notify_no_data: false,
    },
  };
  return JSON.stringify(monitor, null, 2);
}
