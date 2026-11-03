import type { Severity } from '../../../lib/types';

export type AlertSeverity = 'critical' | 'warning' | 'info';

/** The three levels every alerting tool understands. */
export function alertSeverity(severity: Severity): AlertSeverity {
  if (severity === 'critical' || severity === 'high') return 'critical';
  return severity === 'medium' ? 'warning' : 'info';
}

interface Interval {
  minutes: number;
  label: string;
}

const DATADOG_INTERVALS: Interval[] = [
  { minutes: 1, label: '1m' },
  { minutes: 5, label: '5m' },
  { minutes: 10, label: '10m' },
  { minutes: 15, label: '15m' },
  { minutes: 30, label: '30m' },
  { minutes: 60, label: '1h' },
  { minutes: 120, label: '2h' },
  { minutes: 240, label: '4h' },
  { minutes: 1440, label: '1d' },
];

const SENTRY_INTERVALS: Interval[] = [
  { minutes: 1, label: '1m' },
  { minutes: 5, label: '5m' },
  { minutes: 15, label: '15m' },
  { minutes: 60, label: '1h' },
  { minutes: 1440, label: '1d' },
];

/** The smallest interval the tool offers that covers the window (the largest when none does). */
function coveringInterval(intervals: Interval[], windowMinutes: number): string {
  const covering = intervals.find((interval) => interval.minutes >= windowMinutes);
  return (covering ?? intervals[intervals.length - 1]).label;
}

export function datadogWindow(windowMinutes: number): string {
  return coveringInterval(DATADOG_INTERVALS, windowMinutes);
}

export function sentryInterval(windowMinutes: number): string {
  return coveringInterval(SENTRY_INTERVALS, windowMinutes);
}
