import { describe, expect, it } from 'vitest';
import { ttlRegression } from '../../benchmarks/fixtures/ttlRegression';
import { analyzeStructure } from './analyzeStructure';

function incidentWith(analysis: ReturnType<typeof analyzeStructure>, marker: string) {
  return analysis.incidents.find((incident) =>
    incident.anomalyEventIds.some((id) =>
      analysis.log.events.find((event) => event.eventId === id)?.raw.includes(marker),
    ),
  );
}

describe('incidents of the TTL scenario', () => {
  const analysis = analyzeStructure(ttlRegression.log);

  it('finds two incidents: the regression and the unrelated storage timeouts', () => {
    expect(analysis.incidents).toHaveLength(2);
  });

  it('names the configuration change as the confirmed root cause', () => {
    const regression = incidentWith(analysis, 'reservation expired');
    expect(regression?.rootCause.kind).toBe('change');
    expect(regression?.rootCause.status).toBe('confirmed');
    expect(regression?.rootCause.summary).toContain('config reload applied');
    expect(regression?.rootCause.contradicting).toEqual([]);
  });

  it('links the five affected orders to the regression', () => {
    const regression = incidentWith(analysis, 'reservation expired');
    expect(regression?.impact.affectedEntities.sort()).toEqual([
      'O-1101',
      'O-1102',
      'O-1103',
      'O-1105',
      'O-1106',
    ]);
    expect(regression?.impact.paidThenFailed).toHaveLength(5);
  });

  it('keeps the storage timeouts apart, with no root cause claimed', () => {
    const storage = incidentWith(analysis, 'upload timeout');
    expect(storage?.rootCause.status).toBe('insufficient');
    expect(storage?.rootCause.kind).toBe('unknown');
    const regression = incidentWith(analysis, 'reservation expired');
    expect(storage?.anomalyEventIds.some((id) => regression?.anomalyEventIds.includes(id))).toBe(
      false,
    );
    expect(storage?.impact.affectedEntities).toEqual([]);
  });

  it('is complex, so a model is worth calling', () => {
    expect(analysis.complexity.level).toBe('complex');
    expect(analysis.complexity.reasons).toContain('change-before-failures');
    expect(analysis.complexity.reasons).toContain('several-incidents');
  });

  it('rates the regression high and the timeouts low', () => {
    expect(incidentWith(analysis, 'reservation expired')?.severity.severity).toBe('high');
    expect(incidentWith(analysis, 'upload timeout')?.severity.severity).toBe('low');
  });
});

describe('severity and root cause stay honest', () => {
  it('treats one error with a stack trace as simple and probable', () => {
    const log = [
      '2026-11-04T10:00:00Z INFO [api] listening on 3000',
      "2026-11-04T10:00:05Z ERROR [api] TypeError: Cannot read properties of undefined (reading 'id')",
      '    at getUser (/srv/api/user.js:12:9)',
      '    at handle (/srv/api/router.js:40:3)',
    ].join('\n');
    const analysis = analyzeStructure(log);
    expect(analysis.incidents).toHaveLength(1);
    expect(analysis.incidents[0].rootCause.kind).toBe('exception');
    expect(analysis.incidents[0].rootCause.status).toBe('probable');
    expect(analysis.incidents[0].severity.severity).toBe('medium');
    expect(analysis.complexity.level).toBe('simple');
  });

  it('does not call a single HTTP 500 critical', () => {
    const log =
      '10.0.0.7 - - [04/Nov/2026:10:00:00 +0000] "GET /api/orders HTTP/1.1" 500 120 "-" "curl/8"';
    const analysis = analyzeStructure(log);
    expect(analysis.incidents[0].severity.severity).not.toBe('critical');
  });

  it('calls an attack a confirmed attempt, never a compromise', () => {
    const log =
      '10.0.0.9 - - [04/Nov/2026:10:00:00 +0000] "GET /search?q=1%27%20OR%201=1 HTTP/1.1" 403 10 "-" "sqlmap/1.7"';
    const analysis = analyzeStructure(log);
    const [incident] = analysis.incidents;
    expect(incident.impact.security).toBe('attempt');
    expect(incident.rootCause.kind).toBe('security');
    expect(incident.severity.severity).not.toBe('critical');
    expect(incident.severity.reasons.join(' ')).toContain('no compromise shown');
  });

  it('does not treat an HTTP 409 as a network problem', () => {
    const log =
      '2026-11-04T10:00:00Z WARN [checkout] inventory commit rejected status=409 orderId=O-7 reason=version_conflict';
    const analysis = analyzeStructure(log);
    const [incident] = analysis.incidents;
    expect(incident.category).not.toMatch(/network/i);
    expect(incident.rootCause.status).not.toBe('confirmed');
  });

  it('finds no incident in a healthy log', () => {
    const log = [
      '2026-11-04T10:00:00Z INFO [api] request completed status=200',
      '2026-11-04T10:00:01Z INFO [api] request completed status=200',
    ].join('\n');
    const analysis = analyzeStructure(log);
    expect(analysis.incidents).toEqual([]);
    expect(analysis.complexity.level).toBe('simple');
  });

  it('keeps two unrelated failures as two incidents', () => {
    const log = [
      '2026-11-04T10:00:00Z ERROR [billing] invoice render failed invoice=INV-77',
      '2026-11-04T10:30:00Z ERROR [search] index shard unavailable shard=s4',
    ].join('\n');
    const analysis = analyzeStructure(log);
    expect(analysis.incidents).toHaveLength(2);
  });
});

describe('logs without identifiers', () => {
  it('groups repeated failed logins of one kind into one security incident', () => {
    const log = [
      'Nov  4 03:12:01 web1 sshd[2101]: Failed password for root from 203.0.113.50 port 51122 ssh2',
      'Nov  4 03:12:03 web1 sshd[2103]: Failed password for root from 203.0.113.50 port 51124 ssh2',
      'Nov  4 03:12:05 web1 sshd[2105]: Failed password for admin from 203.0.113.50 port 51126 ssh2',
      'Nov  4 03:12:08 web1 sshd[2107]: Failed password for admin from 203.0.113.50 port 51128 ssh2',
    ].join('\n');
    const analysis = analyzeStructure(log);
    expect(analysis.incidents).toHaveLength(1);
    expect(analysis.incidents[0].impact.security).toBe('attempt');
    expect(analysis.incidents[0].severity.severity).toBe('high');
  });

  it('groups failures a second apart and says it was by time only', () => {
    const log = [
      '2026-11-04T09:00:00.100Z ERROR [api] connect ECONNREFUSED db:5432',
      '2026-11-04T09:00:00.600Z ERROR [api] query failed after retries',
    ].join('\n');
    const analysis = analyzeStructure(log);
    expect(analysis.incidents).toHaveLength(1);
    expect(analysis.incidents[0].groupedByTime).toBe(true);
  });

  it('does not group failures that are minutes apart or about different orders', () => {
    const apart = [
      '2026-11-04T09:00:00Z ERROR [api] connect failed',
      '2026-11-04T09:05:00Z ERROR [api] connect failed again',
    ].join('\n');
    expect(analyzeStructure(apart).incidents).toHaveLength(2);
    const differentOrders = [
      '2026-11-04T09:00:00.100Z ERROR [api] payment failed orderId=O-1',
      '2026-11-04T09:00:00.200Z ERROR [api] payment failed orderId=O-2',
    ].join('\n');
    expect(analyzeStructure(differentOrders).incidents).toHaveLength(2);
  });
});
