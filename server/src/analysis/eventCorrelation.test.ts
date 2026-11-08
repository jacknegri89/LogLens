import { describe, expect, it } from 'vitest';
import { ttlRegression } from '../../benchmarks/fixtures/ttlRegression';
import { normalizeLog } from '../parser/normalizeLog';
import { selectContext } from './contextSelection';
import type { EventCorrelation } from './correlationTypes';
import { buildEventCorrelation, newValueOf } from './eventCorrelation';
import { orderEvents } from './eventOrdering';
import { sharedTerms, termsOfText } from './terms';

function correlate(rawLog: string): EventCorrelation {
  return buildEventCorrelation(selectContext(normalizeLog(rawLog)));
}

function eventIdOf(correlation: EventCorrelation, marker: string): string {
  const found = correlation.ordered.find((entry) => entry.event.raw.includes(marker));
  if (found === undefined) {
    throw new Error(`No event contains "${marker}"`);
  }
  return found.event.eventId;
}

describe('buildEventCorrelation on the TTL scenario', () => {
  const correlation = correlate(ttlRegression.log);
  const changeId = eventIdOf(correlation, 'config reload applied');

  it('confirms the change as the cause of every expired reservation', () => {
    const orders = ['R-1101', 'R-1102', 'R-1103', 'R-1105', 'R-1106'];
    for (const reservation of orders) {
      const expiredId = eventIdOf(correlation, `reservation expired reservationId=${reservation}`);
      const link = correlation.links.find(
        (candidate) =>
          candidate.sourceEventId === changeId &&
          candidate.targetEventId === expiredId &&
          candidate.causal,
      );
      expect(link?.certainty, reservation).toBe('confirmed');
    }
  });

  it('does not link the storage timeouts to the deployment or to the orders', () => {
    const storageIds = correlation.ordered
      .filter((entry) => entry.event.raw.includes('upload timeout'))
      .map((entry) => entry.event.eventId);
    expect(storageIds.length).toBe(6);
    const touching = correlation.links.filter(
      (link) =>
        link.causal &&
        storageIds.includes(link.sourceEventId) !== storageIds.includes(link.targetEventId),
    );
    expect(touching).toEqual([]);
  });

  it('groups the six storage timeouts as one recurrence', () => {
    const storageRecurrence = correlation.recurrences.find((group) =>
      group.signature.includes('upload timeout'),
    );
    expect(storageRecurrence?.eventIds.length).toBe(6);
  });

  it('only creates links that go forward in time, so there are no cycles', () => {
    for (const link of correlation.links) {
      const source = correlation.ordered.find(
        (entry) => entry.event.eventId === link.sourceEventId,
      );
      const target = correlation.ordered.find(
        (entry) => entry.event.eventId === link.targetEventId,
      );
      expect(source!.position).toBeLessThan(target!.position);
    }
  });

  it('gives every link evidence that points at real lines', () => {
    for (const link of correlation.links) {
      expect(link.evidence.length).toBeGreaterThanOrEqual(2);
      for (const reference of link.evidence) {
        const event = correlation.ordered.find(
          (entry) => entry.event.eventId === reference.eventId,
        );
        expect(event?.event.raw.startsWith(reference.quote.slice(0, 40))).toBe(true);
        expect(reference.lineStart).toBe(event?.event.originalLineStart);
      }
    }
  });

  it('keeps the late fulfillment lines after the events that caused them', () => {
    const failureId = eventIdOf(correlation, 'failed to fulfill order orderId=O-1101');
    const paymentId = eventIdOf(correlation, 'payment confirmed orderId=O-1101');
    const failure = correlation.ordered.find((entry) => entry.event.eventId === failureId);
    const payment = correlation.ordered.find((entry) => entry.event.eventId === paymentId);
    expect(failure!.position).toBeGreaterThan(payment!.position);
    expect(failure!.fileIndex).toBeGreaterThan(payment!.fileIndex);
  });
});

describe('what the engine refuses to conclude', () => {
  it('does not link two failures only because they come from one address', () => {
    const log = [
      '2026-11-04T10:00:00Z ERROR [web] request failed from 10.1.1.9 path=/a',
      '2026-11-04T10:00:05Z ERROR [mailer] smtp connection refused from 10.1.1.9',
    ].join('\n');
    const correlation = correlate(log);
    expect(correlation.links.filter((link) => link.causal)).toEqual([]);
  });

  it('does not link events only because they are close in time', () => {
    const log = [
      '2026-11-04T10:00:00Z ERROR [billing] invoice render failed id=INV-77',
      '2026-11-04T10:00:00Z ERROR [search] index shard unavailable shard=s4',
    ].join('\n');
    const correlation = correlate(log);
    expect(
      correlation.links.filter((link) => link.causal && link.certainty === 'confirmed'),
    ).toEqual([]);
  });

  it('links events that share a strong identifier as the same story', () => {
    const log = [
      '2026-11-04T10:00:00Z INFO [api] start request_id=req-9001',
      '2026-11-04T10:00:01Z ERROR [db] query failed request_id=req-9001',
    ].join('\n');
    const correlation = correlate(log);
    const identity = correlation.links.find((link) => link.relation === 'same-identifier');
    expect(identity?.certainty).toBe('confirmed');
    expect(identity?.causal).toBe(false);
  });
});

describe('orderEvents', () => {
  it('orders events from different time zones by the instant they happened', () => {
    const log = [
      '2026-11-04T12:00:00+01:00 ERROR [a] first failure code=E1',
      '2026-11-04T10:30:00Z ERROR [b] later failure code=E2',
      '2026-11-04T10:15:00Z ERROR [c] earlier failure code=E3',
    ].join('\n');
    const selection = selectContext(normalizeLog(log));
    const ordered = orderEvents(selection.selected);
    const services = ordered.map((entry) => entry.event.service);
    // 12:00+01:00 is 11:00 UTC, so it is the last of the three.
    expect(services).toEqual(['c', 'b', 'a']);
  });

  it('marks an event without a time as inferred from the file', () => {
    const log = [
      '2026-11-04T10:00:00Z ERROR [a] something failed',
      'ERROR [b] this line has no time',
    ].join('\n');
    const ordered = orderEvents(selectContext(normalizeLog(log)).selected);
    expect(ordered[1].timeBasis).toBe('inferred');
  });
});

describe('newValueOf and terms', () => {
  it('reads the new value of a change', () => {
    const [event] = normalizeLog(
      '2026-11-04T10:00:00Z INFO config reload: ttlMs changed from 900000 to 900',
    ).events;
    expect(newValueOf(event)).toBe('900');
  });

  it('finds the subject two texts share', () => {
    const left = termsOfText('reservation.ttlMs changed');
    const right = termsOfText('reservation expired');
    expect(sharedTerms(left, right).length).toBeGreaterThan(0);
  });

  it('finds nothing in common between unrelated subjects', () => {
    const left = termsOfText('reservation.ttlMs changed');
    const right = termsOfText('upload timeout key=reports');
    expect(sharedTerms(left, right)).toEqual([]);
  });
});
