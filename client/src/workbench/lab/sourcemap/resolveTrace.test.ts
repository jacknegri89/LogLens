import { describe, expect, it } from 'vitest';

import { MAX_RESOLVED_FRAMES, resolveTrace } from './resolveTrace';
import { parseSourceMap, type LoadedSourceMap } from './sourceMap';

// Same hand-made map as in sourceMap.test.ts: min.js 1:11 is src/app.ts 3:5, 2:5 is src/util.ts 4:1.
const MAP_TEXT = JSON.stringify({
  version: 3,
  sources: ['src/app.ts', 'src/util.ts'],
  names: ['start', 'helper'],
  mappings: 'AAAAA,UAEIA,eCFFC;IAGF',
});

function loadMap(): LoadedSourceMap {
  const parsed = parseSourceMap(MAP_TEXT);
  if (!parsed.ok) {
    throw new Error('Map did not load');
  }
  return parsed.map;
}

describe('resolveTrace', () => {
  it('resolves Chrome and Firefox frames and keeps the order', () => {
    const trace = [
      'TypeError: boom',
      '    at e (https://cdn.test/min.js:1:11)',
      'f@https://cdn.test/min.js:2:5',
    ].join('\n');
    const frames = resolveTrace(loadMap(), trace);
    expect(frames).toHaveLength(2);
    expect(frames[0].resolution).toMatchObject({
      status: 'resolved',
      source: 'src/app.ts',
      line: 3,
    });
    expect(frames[1].resolution).toMatchObject({
      status: 'resolved',
      source: 'src/util.ts',
      line: 4,
    });
  });

  it('keeps unresolved frames with their reason', () => {
    const trace = [
      'at Array.map (<anonymous>)',
      'at e (https://cdn.test/min.js:9:1)',
      'at e (https://cdn.test/min.js:2:1)',
    ].join('\n');
    const reasons = resolveTrace(loadMap(), trace).map((item) => {
      if (item.resolution.status === 'unresolved') {
        return item.resolution.reason;
      }
      return 'resolved';
    });
    expect(reasons).toEqual(['noPosition', 'lineOutsideMap', 'noMappingAtColumn']);
  });

  it('returns nothing for text without frames', () => {
    expect(resolveTrace(loadMap(), 'nothing to see here')).toEqual([]);
  });

  it('cuts a very long trace', () => {
    const trace = Array.from({ length: MAX_RESOLVED_FRAMES + 50 }, () => 'at e (min.js:1:11)');
    expect(resolveTrace(loadMap(), trace.join('\n'))).toHaveLength(MAX_RESOLVED_FRAMES);
  });
});
