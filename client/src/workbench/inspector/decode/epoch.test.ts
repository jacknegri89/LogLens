import { describe, expect, it } from 'vitest';

import { describeAge, epochToMilliseconds, findEpochs } from './epoch';

describe('epochToMilliseconds', () => {
  it('reads 10 digits as seconds and 13 digits as milliseconds', () => {
    expect(epochToMilliseconds('1700000000')).toEqual({
      milliseconds: 1_700_000_000_000,
      unit: 'seconds',
    });
    expect(epochToMilliseconds('1700000000123')).toEqual({
      milliseconds: 1_700_000_000_123,
      unit: 'milliseconds',
    });
  });

  it('rejects other lengths and years outside 2000-2100', () => {
    expect(epochToMilliseconds('170000000')).toBeNull();
    expect(epochToMilliseconds('17000000000')).toBeNull();
    expect(epochToMilliseconds('0000000001')).toBeNull();
    expect(epochToMilliseconds('9999999999')).toBeNull();
    expect(epochToMilliseconds('9999999999999')).toBeNull();
    expect(epochToMilliseconds('0946684799')).toBeNull();
  });
});

describe('findEpochs', () => {
  it('finds timestamps in key=value pairs and JSON fields', () => {
    expect(findEpochs('ts=1700000000 done').map((token) => token.source)).toEqual(['1700000000']);
    expect(findEpochs('{"exp":1700000000,"t":1700000000123}').map((token) => token.source)).toEqual(
      ['1700000000', '1700000000123'],
    );
  });

  it('keeps the position of the digits', () => {
    const line = 'at 1700000000 ok';
    const [token] = findEpochs(line);
    expect(line.slice(token.start, token.end)).toBe('1700000000');
  });

  it('skips digits inside longer numbers, ids and words', () => {
    expect(findEpochs('id=17000000001')).toEqual([]);
    expect(findEpochs('order-1700000000')).toEqual([]);
    expect(findEpochs('abc1700000000')).toEqual([]);
    expect(findEpochs('1700000000abc')).toEqual([]);
    expect(findEpochs('build 123456789 and 99999999999')).toEqual([]);
  });
});

describe('describeAge', () => {
  const now = Date.UTC(2024, 0, 15, 12, 0, 0);

  it('uses the largest whole unit', () => {
    expect(describeAge(now - 30_000, now)).toEqual({ amount: 30, unit: 'second', inFuture: false });
    expect(describeAge(now - 5 * 3_600_000, now)).toEqual({
      amount: 5,
      unit: 'hour',
      inFuture: false,
    });
    expect(describeAge(now - 3 * 86_400_000, now)).toEqual({
      amount: 3,
      unit: 'day',
      inFuture: false,
    });
  });

  it('marks a time in the future', () => {
    expect(describeAge(now + 120_000, now)).toEqual({ amount: 2, unit: 'minute', inFuture: true });
  });
});
