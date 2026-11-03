import { describe, expect, it } from 'vitest';

import { parseLines } from '../../core/basicParse';
import {
  advanceScan,
  createScan,
  findRanges,
  isScanDone,
  readScan,
  type ScanOptions,
} from './regexScan';

const OPTIONS: ScanOptions = { maxMatches: 5000, maxPreviewLines: 300, maxLineLength: 4000 };

function scanAll(log: string, pattern: string, options = OPTIONS, firstMatchOnly = false) {
  const scan = createScan(parseLines(log), new RegExp(pattern, 'gi'), firstMatchOnly, options);
  advanceScan(scan, 10_000);
  return readScan(scan);
}

describe('findRanges', () => {
  it('returns every match and skips empty ones without looping forever', () => {
    expect(findRanges('axxbx', /x*/g, false, 10)).toEqual([
      { start: 1, end: 3 },
      { start: 4, end: 5 },
    ]);
  });

  it('stops at the first match when asked and at the limit otherwise', () => {
    expect(findRanges('aaa', /a/g, true, 10)).toHaveLength(1);
    expect(findRanges('aaa', /a/g, false, 2)).toHaveLength(2);
  });
});

describe('scan', () => {
  const LOG = [
    'INFO ok',
    'ERROR db 10.0.0.1 down',
    'ERROR db 10.0.0.1 down',
    'ERROR cache 10.0.0.2',
  ].join('\n');

  it('counts matches, matched lines and the value of each match', () => {
    const snapshot = scanAll(LOG, '\\d+\\.\\d+\\.\\d+\\.\\d+');
    expect(snapshot.matchCount).toBe(3);
    expect(snapshot.matchedLineCount).toBe(3);
    expect(snapshot.values).toEqual([
      { value: '10.0.0.1', count: 2 },
      { value: '10.0.0.2', count: 1 },
    ]);
    expect(snapshot.done && !snapshot.stoppedEarly).toBe(true);
  });

  it('records one preview per matching line with the matched ranges', () => {
    const snapshot = scanAll(LOG, 'error');
    expect(snapshot.previews.map((preview) => preview.lineIndex)).toEqual([1, 2, 3]);
    expect(snapshot.previews[0].ranges).toEqual([{ start: 0, end: 5 }]);
  });

  it('takes one match per line when the g flag is off', () => {
    expect(scanAll('a a a\nb a', 'a', OPTIONS, true).matchCount).toBe(2);
  });

  it('reports no match for a pattern that never occurs', () => {
    const snapshot = scanAll(LOG, 'zzz');
    expect(snapshot.matchCount).toBe(0);
    expect(snapshot.previews).toEqual([]);
    expect(snapshot.done).toBe(true);
  });

  it('stops at the match cap and says it stopped early', () => {
    const log = Array.from({ length: 50 }, () => 'hit hit hit').join('\n');
    const snapshot = scanAll(log, 'hit', { ...OPTIONS, maxMatches: 10 });
    expect(snapshot.matchCount).toBe(10);
    expect(snapshot.stoppedEarly).toBe(true);
    expect(snapshot.scannedLines).toBeLessThan(50);
  });

  it('does not call it early when the cap is reached on the last line', () => {
    const snapshot = scanAll('hit\nhit', 'hit', { ...OPTIONS, maxMatches: 2 });
    expect(snapshot.matchCount).toBe(2);
    expect(snapshot.stoppedEarly).toBe(false);
  });

  it('keeps only the first preview lines but counts every match', () => {
    const log = Array.from({ length: 20 }, () => 'hit').join('\n');
    const snapshot = scanAll(log, 'hit', { ...OPTIONS, maxPreviewLines: 5 });
    expect(snapshot.previews).toHaveLength(5);
    expect(snapshot.matchedLineCount).toBe(20);
  });

  it('searches only the start of a very long line', () => {
    const log = `${'a'.repeat(50)}needle`;
    expect(scanAll(log, 'needle', { ...OPTIONS, maxLineLength: 20 }).matchCount).toBe(0);
  });
});

describe('time budget', () => {
  it('works in slices: a spent budget returns before the end and the next slice continues', () => {
    const log = Array.from({ length: 100 }, (_, index) => `line ${index}`).join('\n');
    const scan = createScan(parseLines(log), /line/g, false);
    let clock = 0;
    const tickingClock = () => (clock += 10);

    advanceScan(scan, 50, tickingClock);
    expect(scan.nextLine).toBeGreaterThan(0);
    expect(scan.nextLine).toBeLessThan(100);
    expect(isScanDone(scan)).toBe(false);

    while (!isScanDone(scan)) advanceScan(scan, 50, tickingClock);
    expect(readScan(scan).matchCount).toBe(100);
  });

  it('does not scan anything when the budget is zero', () => {
    const scan = createScan(parseLines('a\nb'), /a/g, false);
    advanceScan(scan, 0, () => 5);
    expect(scan.nextLine).toBe(0);
  });
});
