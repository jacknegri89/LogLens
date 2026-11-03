import { describe, expect, it } from 'vitest';

import { parseLines } from '../core/basicParse';
import { findFlameNode, fitLabel, layoutFlame } from './flameLayout';
import {
  buildFlameTree,
  MAX_OPERATIONS_PER_SERVICE,
  normalizeSegment,
  operationName,
  UNKNOWN_SERVICE,
} from './flamegraph';

const SAMPLE = [
  '2026-11-03T09:00:00Z INFO [api] GET /orders/101 took 100ms',
  '2026-11-03T09:00:01Z INFO [api] GET /orders/202 took 300ms',
  '2026-11-03T09:00:02Z INFO [api] POST /orders took 50ms',
  '2026-11-03T09:00:03Z INFO [db] slow query select took 550ms',
  '2026-11-03T09:00:04Z INFO nothing to measure here',
  '2026-11-03T09:00:05Z INFO cache warmup took 1000ms',
].join('\n');

describe('operationName', () => {
  it('normalizes numbers, uuids and hashes in an HTTP path', () => {
    expect(operationName('GET /orders/42/items/7')).toBe('GET /orders/:id/items/:id');
    expect(operationName('DELETE /users/3f2b8c1e-1111-4222-8333-944455556666')).toBe(
      'DELETE /users/:id',
    );
    expect(operationName('GET /files/9f86d081884c7d65')).toBe('GET /files/:id');
  });

  it('drops the query string and keeps words that only look like ids', () => {
    expect(operationName('GET /search?q=1234 200')).toBe('GET /search');
    expect(normalizeSegment('feedback')).toBe('feedback');
    expect(normalizeSegment('orders')).toBe('orders');
  });

  it('falls back to the first three words, with numbers normalized', () => {
    expect(operationName('slow query on table orders')).toBe('slow query on');
    expect(operationName('retry 5 failed')).toBe('retry :id failed');
  });

  it('never returns an empty name', () => {
    expect(operationName('   ')).toBe(UNKNOWN_SERVICE);
  });
});

describe('buildFlameTree', () => {
  it('aggregates total, count and max per service and operation', () => {
    const tree = buildFlameTree(parseLines(SAMPLE));
    const api = tree?.children.find((node) => node.label === 'api');
    const orders = api?.children.find((node) => node.label === 'GET /orders/:id');

    expect(tree?.total).toBe(2000);
    expect(api).toMatchObject({ total: 450, count: 3, max: 300 });
    expect(orders).toMatchObject({ total: 400, count: 2, max: 300 });
  });

  it('orders services and operations by total, largest first', () => {
    const tree = buildFlameTree(parseLines(SAMPLE));

    expect(tree?.children.map((node) => node.label)).toEqual(['unknown', 'db', 'api']);
    expect(tree?.children[2].children.map((node) => node.label)).toEqual([
      'GET /orders/:id',
      'POST /orders',
    ]);
  });

  it('gives each node its share of the whole and numbers the services', () => {
    const tree = buildFlameTree(parseLines(SAMPLE));

    expect(tree?.share).toBe(1);
    expect(tree?.children[0].share).toBeCloseTo(0.5);
    expect(tree?.children.map((node) => node.serviceIndex)).toEqual([0, 1, 2]);
    expect(tree?.children[1].children[0].serviceIndex).toBe(1);
  });

  it('is null when no line has a positive latency', () => {
    expect(buildFlameTree(parseLines('plain line\nanother one'))).toBeNull();
    expect(buildFlameTree(parseLines('GET /a took 0ms'))).toBeNull();
    expect(buildFlameTree([])).toBeNull();
  });

  it('merges the smallest operations of a service into one other block', () => {
    const rows = Array.from(
      { length: MAX_OPERATIONS_PER_SERVICE + 5 },
      (_, index) =>
        `[api] op${String.fromCharCode(97 + (index % 26))}${'x'.repeat(index)} took ${index + 1}ms`,
    );
    const api = buildFlameTree(parseLines(rows.join('\n')))?.children[0];

    expect(api?.children).toHaveLength(MAX_OPERATIONS_PER_SERVICE);
    expect(api?.children.at(-1)).toMatchObject({ kind: 'other', mergedOperations: 6 });
    expect(api?.children.reduce((sum, node) => sum + node.total, 0)).toBe(api?.total);
  });
});

describe('layoutFlame', () => {
  it('splits every row across the full width in proportion to latency', () => {
    const tree = buildFlameTree(parseLines(SAMPLE));
    const rects = layoutFlame(tree!, 1000);
    const services = rects.filter((rect) => rect.depth === 1);

    expect(rects[0]).toMatchObject({ depth: 0, x: 0, width: 1000 });
    expect(services.map((rect) => Math.round(rect.width))).toEqual([500, 275, 225]);
    expect(services[1].x).toBeCloseTo(services[0].width);
  });

  it('shows a zoomed node over the full width and skips slivers', () => {
    const tree = buildFlameTree(parseLines(SAMPLE))!;
    const api = findFlameNode(tree, 'svc:api')!;
    const rects = layoutFlame(api, 400);

    expect(rects[0].node.label).toBe('api');
    expect(rects[0].width).toBe(400);
    expect(layoutFlame(tree, 4).filter((rect) => rect.depth > 0)).toHaveLength(2);
  });
});

describe('findFlameNode and fitLabel', () => {
  it('finds a node by id and returns null for an unknown one', () => {
    const tree = buildFlameTree(parseLines(SAMPLE))!;

    expect(findFlameNode(tree, 'svc:db')?.label).toBe('db');
    expect(findFlameNode(tree, 'svc:missing')).toBeNull();
  });

  it('cuts a label to the width with an ellipsis, or hides it', () => {
    expect(fitLabel('GET /orders', 200, 7)).toBe('GET /orders');
    expect(fitLabel('GET /orders/:id', 62, 7)).toBe('GET /o…');
    expect(fitLabel('GET /orders', 10, 7)).toBe('');
  });
});
