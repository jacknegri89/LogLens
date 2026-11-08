import { describe, expect, it } from 'vitest';

import { parseLines } from '../core/basicParse';
import { buildClusters, filterClusters, MAX_SAMPLES, sortClusters } from './buildClusters';

const LOG = [
  '2024-01-01T10:00:00Z INFO [api] user 1 logged in',
  '2024-01-01T10:00:05Z ERROR [api] payment 77 failed: card declined',
  '2024-01-01T10:00:09Z INFO [web] user 2 logged in',
  '2024-01-01T10:00:20Z ERROR [api] payment 78 failed: card declined',
  '2024-01-01T10:00:30Z WARN [db] slow query',
  '2024-01-01T10:00:40Z INFO [web] user 3 logged in',
].join('\n');

describe('buildClusters', () => {
  const clusters = buildClusters(parseLines(LOG));

  it('groups lines that only differ by ids', () => {
    expect(clusters.map((cluster) => cluster.count)).toEqual([3, 2, 1]);
  });

  it('collects times, services, levels and faults', () => {
    const payment = clusters[1];
    expect(payment.faultCount).toBe(2);
    expect(payment.topLevel).toBe('ERROR');
    expect(payment.levelCounts).toEqual({ ERROR: 2 });
    expect(payment.services).toEqual(['api']);
    expect(payment.lastTimestamp! - payment.firstTimestamp!).toBe(15_000);
    expect(payment.sampleIndexes).toEqual([1, 3]);
    expect(clusters[0].services).toEqual(['api', 'web']);
  });

  it('keeps no more than the sample limit but counts everything', () => {
    const many = buildClusters(
      parseLines(Array.from({ length: 50 }, (_, i) => `INFO job ${i} ok`).join('\n')),
    );
    expect(many).toHaveLength(1);
    expect(many[0].count).toBe(50);
    expect(many[0].sampleIndexes).toHaveLength(MAX_SAMPLES);
  });

  it('returns nothing for an empty log', () => {
    expect(buildClusters([])).toEqual([]);
  });
});

describe('sortClusters and filterClusters', () => {
  const clusters = buildClusters(parseLines(LOG));

  it('sorts by count', () => {
    expect(sortClusters(clusters, 'count')[0].count).toBe(3);
  });

  it('sorts by the most recent occurrence', () => {
    expect(sortClusters(clusters, 'recency')[0].template).toContain('logged in');
    expect(sortClusters(clusters, 'recency')[1].template).toBe('slow query');
  });

  it('sorts faults and severity first', () => {
    expect(sortClusters(clusters, 'severity')[0].template).toContain('payment');
  });

  it('does not change the list it was given', () => {
    const before = clusters.map((cluster) => cluster.template);
    sortClusters(clusters, 'severity');
    expect(clusters.map((cluster) => cluster.template)).toEqual(before);
  });

  it('keeps only clusters with faults when asked', () => {
    expect(filterClusters(clusters, true)).toHaveLength(1);
    expect(filterClusters(clusters, false)).toHaveLength(3);
  });
});

describe('performance budget', () => {
  it('clusters 50,000 lines in under 2 seconds', () => {
    const services = ['api', 'web', 'db', 'cache'];
    const text = Array.from({ length: 50_000 }, (_, i) => {
      const time = new Date(Date.UTC(2024, 0, 1) + i * 1000).toISOString();
      const kind = i % 7;
      let level = 'INFO';
      if (kind === 0) {
        level = 'ERROR';
      }
      return `${time} ${level} [${services[i % 4]}] req-${i.toString(16).padStart(8, '0')} user=${i} handled /orders/${i}/items in ${i % 900}ms from 10.0.${i % 255}.${i % 200}`;
    }).join('\n');
    const lines = parseLines(text);
    const started = performance.now();
    const clusters = buildClusters(lines);
    const elapsed = performance.now() - started;
    expect(lines).toHaveLength(50_000);
    expect(clusters.length).toBeLessThan(10);
    expect(elapsed).toBeLessThan(2000);
  });
});
