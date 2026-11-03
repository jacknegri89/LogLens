import { doubleQuoted, neutralizeMentions, neutralizeTemplates } from './escape';
import type { AlertSettings } from './settings';
import { datadogWindow } from './vocabulary';

function warningThreshold(threshold: number): number | null {
  const half = Math.floor(threshold / 2);
  return half >= 1 && half < threshold ? half : null;
}

/** Datadog log monitor, ready for POST /api/v1/monitor. The phrase is quoted, so it is literal. */
export function buildDatadogMonitor(settings: AlertSettings): string {
  const { pattern, threshold, windowMinutes } = settings;
  const search = `logs(${doubleQuoted(doubleQuoted(pattern))}).index("*").rollup("count").last("${datadogWindow(windowMinutes)}") > ${threshold}`;
  const warning = warningThreshold(threshold);
  const shown = neutralizeMentions(neutralizeTemplates(pattern));
  const monitor = {
    name: 'LogLens: repeated log pattern',
    type: 'log alert',
    query: search,
    message: `The log pattern was seen more than ${threshold} times in ${windowMinutes} minutes: ${shown}`,
    tags: ['source:loglens'],
    options: {
      thresholds: warning === null ? { critical: threshold } : { critical: threshold, warning },
      notify_no_data: false,
    },
  };
  return JSON.stringify(monitor, null, 2);
}
