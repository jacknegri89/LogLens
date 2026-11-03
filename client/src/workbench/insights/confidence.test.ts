import { describe, expect, it } from 'vitest';

import type { Finding, TimelineEntry } from '../../lib/types';
import {
  isSpecificTerm,
  leadSentence,
  rankCauses,
  shareUnits,
  significantTerms,
  TOP_CONFIDENCE_CAP,
  type ConfidenceInput,
} from './confidence';

const ROOT_TITLE = 'connect ECONNREFUSED 10.0.2.15:5432';
const EFFECT_TITLE = "TypeError: Cannot read properties of undefined (reading 'rows')";

const INCIDENT: ConfidenceInput = {
  causes: [
    `Probable root cause: ${ROOT_TITLE} (Database). Likely consequences: ${EFFECT_TITLE}.`,
    'The service you connect to is not running, or is not ready yet when the app starts.',
    'The host or port is wrong. Inside Docker, "localhost" is the container itself.',
    'A firewall or network policy blocks the connection.',
  ],
  keyLines: [
    `2026-11-03T09:14:07Z ERROR ${ROOT_TITLE}`,
    `2026-11-03T09:14:09Z ERROR ${EFFECT_TITLE}`,
  ],
  findings: [
    finding(ROOT_TITLE, 'Database'),
    finding('pool exhausted, 20/20 connections in use', 'Database'),
    finding(EFFECT_TITLE, 'Runtime'),
  ],
  timeline: [entry(ROOT_TITLE, 'root'), entry(EFFECT_TITLE, 'effect')],
};

function finding(title: string, category: string): Finding {
  return { title, severity: 'high', category, evidence: title };
}

function entry(title: string, role: TimelineEntry['role']): TimelineEntry {
  return { title, category: 'Database', severity: 'high', role, evidence: title };
}

function total(result: ReturnType<typeof rankCauses>): number {
  const sum = result.causes.reduce((all, item) => all + item.percent, 0) + result.otherPercent;
  return Math.round(sum * 10) / 10;
}

describe('rankCauses', () => {
  it('puts the cause that names the root event first and lets the percentages add up to 100', () => {
    const result = rankCauses(INCIDENT);

    expect(result.causes.map((item) => item.index)).toEqual([0, 1, 2, 3]);
    expect(result.causes[0].breakdown.rootCause).toBe(20);
    expect(result.causes[0].breakdown.corroboration).toBeGreaterThan(0);
    expect(result.causes[1].breakdown.rootCause).toBe(0);
    expect(total(result)).toBe(100);
    expect(result.causes[0].percent).toBeGreaterThan(result.causes[1].percent);
  });

  it('is deterministic and keeps at most one decimal', () => {
    const first = rankCauses(INCIDENT);

    expect(rankCauses(INCIDENT)).toEqual(first);
    first.causes.forEach((item) =>
      expect(Math.round(item.percent * 10)).toBeCloseTo(item.percent * 10),
    );
  });

  it('keeps the report order when the points are equal', () => {
    const result = rankCauses({
      causes: ['alpha', 'beta'],
      keyLines: [],
      findings: [],
      timeline: [],
    });

    expect(result.causes.map((item) => item.index)).toEqual([0, 1]);
  });

  it('can rank a lower listed cause first when the evidence backs it', () => {
    const result = rankCauses({
      causes: [
        'Plain guess about the network.',
        `The proxy returns error ${'E12345'} upstream timeout.`,
      ],
      keyLines: ['proxy error E12345 upstream timeout'],
      findings: [],
      timeline: [entry('proxy error E12345 upstream timeout', 'root')],
    });

    expect(result.causes[0].index).toBe(1);
  });

  it('caps a single cause at 95% and reports the rest as not listed', () => {
    const result = rankCauses({ ...INCIDENT, causes: [INCIDENT.causes[0]] });

    expect(result.causes).toHaveLength(1);
    expect(result.causes[0].percent).toBe(TOP_CONFIDENCE_CAP);
    expect(result.otherPercent).toBe(5);
    expect(total(result)).toBe(100);
  });

  it('caps a dominant top cause and shares the rest among the others', () => {
    const strong = INCIDENT.causes[0];
    const result = rankCauses({ ...INCIDENT, causes: [strong, 'a', 'b'].map((cause) => cause) });

    expect(result.causes[0].percent).toBeLessThanOrEqual(TOP_CONFIDENCE_CAP);
    expect(result.otherPercent).toBe(0);
    expect(total(result)).toBe(100);
  });

  it('returns nothing for an empty list', () => {
    expect(rankCauses({ ...INCIDENT, causes: [] })).toEqual({ causes: [], otherPercent: 0 });
  });

  it('works without any evidence', () => {
    const result = rankCauses({
      causes: ['one', 'two', 'three'],
      keyLines: [],
      findings: [],
      timeline: [],
    });

    expect(result.causes.map((item) => item.breakdown.position)).toEqual([40, 32, 24]);
    expect(total(result)).toBe(100);
  });
});

describe('shareUnits', () => {
  it('gives whole units that add up to the total', () => {
    const shares = shareUnits([1, 1, 1], 1000);

    expect(shares.reduce((sum, share) => sum + share, 0)).toBe(1000);
    expect(shares).toEqual([334, 333, 333]);
  });
});

describe('significantTerms', () => {
  it('drops short words, stop words and timestamps but keeps codes and addresses', () => {
    const terms = significantTerms(
      '2026-11-03T09:14:07Z ERROR connect to ECONNREFUSED 10.0.2.15:5432, this is bad',
    );

    expect([...terms].sort()).toEqual(['10.0.2.15:5432', 'connect', 'econnrefused']);
  });

  it('tells a specific term from a plain word', () => {
    expect(isSpecificTerm('econnrefused')).toBe(true);
    expect(isSpecificTerm('5432')).toBe(true);
    expect(isSpecificTerm('connect')).toBe(false);
  });
});

describe('leadSentence', () => {
  it('returns the first sentence without splitting inside an address', () => {
    expect(
      leadSentence(
        'Probable root cause: connect ECONNREFUSED 10.0.2.15:5432 (Database). Then more.',
      ),
    ).toBe('Probable root cause: connect ECONNREFUSED 10.0.2.15:5432 (Database).');
  });

  it('handles a missing or empty paragraph', () => {
    expect(leadSentence(undefined)).toBe('');
    expect(leadSentence('   ')).toBe('');
  });
});
