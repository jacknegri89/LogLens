import type { AlertSettings } from './settings';
import { sentryInterval } from './vocabulary';

/** Sentry issue alert rule, ready for the project rules API; the message filter is a plain "contains". */
export function buildSentryRule(settings: AlertSettings): string {
  const { pattern, threshold, windowMinutes } = settings;
  const rule = {
    name: 'LogLens: repeated log pattern',
    actionMatch: 'all',
    filterMatch: 'all',
    frequency: 30,
    conditions: [
      {
        id: 'sentry.rules.conditions.event_frequency.EventFrequencyCondition',
        value: threshold,
        interval: sentryInterval(windowMinutes),
      },
    ],
    filters: [
      {
        id: 'sentry.rules.filters.event_attribute.EventAttributeFilter',
        attribute: 'message',
        match: 'co',
        value: pattern,
      },
    ],
    actions: [
      {
        id: 'sentry.mail.actions.NotifyEmailAction',
        targetType: 'IssueOwners',
        fallthroughType: 'ActiveMembers',
      },
    ],
  };
  return JSON.stringify(rule, null, 2);
}
