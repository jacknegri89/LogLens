import { describe, expect, it } from 'vitest';

import {
  createMappingsReader,
  findSegment,
  MappingsError,
  MappingsLimitError,
  readVlq,
} from './mappings';

it('rejects source maps that exceed the decoding limits', () => {
  expect(() => createMappingsReader(';'.repeat(100_001)).readLine(100_000)).toThrow(
    MappingsLimitError,
  );
  expect(() => createMappingsReader('A,'.repeat(250_001)).readLine(0)).toThrow(MappingsLimitError);
});

it('reports a line outside an already completed short map', () => {
  const reader = createMappingsReader('A');
  expect(reader.readLine(0)).toHaveLength(1);
  expect(reader.readLine(100_000)).toBeNull();
});

it('shares the segment limit across readers for an indexed source map', () => {
  const budget = { decodedLines: 0, decodedSegments: 249_999 };
  expect(createMappingsReader('A', budget).readLine(0)).toHaveLength(1);
  expect(() => createMappingsReader('A', budget).readLine(0)).toThrow(MappingsLimitError);
});
import { parseFrameLine, parseStackTrace } from './parseStackTrace';
import { buildSnippet, joinSourcePath, resolvePosition } from './resolvePosition';
import { parseSourceMap, type LoadedSourceMap } from './sourceMap';

/*
 * Hand-made map of a generated file `min.js`. Decoded by hand:
 *   generated line 1: col 0  -> src/app.ts   0:0  name "start"
 *                     col 10 -> src/app.ts   2:4  name "start"
 *                     col 25 -> src/util.ts  0:2  name "helper"
 *   generated line 2: col 4  -> src/util.ts  3:0  (no name)
 * Lines and columns above are 0-based, as in the map.
 */
const MAPPINGS = 'AAAAA,UAEIA,eCFFC;IAGF';
const APP_SOURCE = 'const a = 1;\n\nstart(a);\nexport {};';
const UTIL_SOURCE = 'export function helper() {\n  return 1;\n}\nexport const x = 2;';
const MAP_TEXT = JSON.stringify({
  version: 3,
  file: 'min.js',
  sources: ['src/app.ts', 'src/util.ts'],
  names: ['start', 'helper'],
  sourcesContent: [APP_SOURCE, UTIL_SOURCE],
  mappings: MAPPINGS,
});

function loadMap(text: string): LoadedSourceMap {
  const parsed = parseSourceMap(text);
  if (!parsed.ok) {
    throw new Error(`Map did not load: ${parsed.problem}`);
  }
  return parsed.map;
}

function cursorOf(text: string) {
  return { text, position: 0 };
}

describe('readVlq', () => {
  it('decodes known values', () => {
    const expected: Array<[string, number]> = [
      ['A', 0],
      ['C', 1],
      ['D', -1],
      ['E', 2],
      ['gB', 16],
      ['hB', -16],
      ['2H', 123],
    ];
    for (const [text, value] of expected) {
      expect(readVlq(cursorOf(text)), text).toBe(value);
    }
  });

  it('moves the cursor past the number', () => {
    const cursor = cursorOf('gBC');
    readVlq(cursor);
    expect(cursor.position).toBe(2);
  });

  it('rejects characters outside base64 and numbers that never end', () => {
    expect(() => readVlq(cursorOf('!'))).toThrow(MappingsError);
    expect(() => readVlq(cursorOf('gggggggg'))).toThrow(MappingsError);
    expect(() => readVlq(cursorOf('g'))).toThrow(MappingsError);
  });
});

describe('mappings reader', () => {
  it('decodes segments with positions relative to the previous one', () => {
    const reader = createMappingsReader(MAPPINGS);
    expect(reader.readLine(0)).toEqual([
      { generatedColumn: 0, sourceIndex: 0, originalLine: 0, originalColumn: 0, nameIndex: 0 },
      { generatedColumn: 10, sourceIndex: 0, originalLine: 2, originalColumn: 4, nameIndex: 0 },
      { generatedColumn: 25, sourceIndex: 1, originalLine: 0, originalColumn: 2, nameIndex: 1 },
    ]);
    expect(reader.readLine(1)).toEqual([
      { generatedColumn: 4, sourceIndex: 1, originalLine: 3, originalColumn: 0, nameIndex: -1 },
    ]);
  });

  it('returns null past the last line and for negative lines', () => {
    const reader = createMappingsReader(MAPPINGS);
    expect(reader.readLine(2)).toBeNull();
    expect(reader.readLine(-1)).toBeNull();
  });

  it('reads empty lines and segments that point to no source', () => {
    const reader = createMappingsReader('AAAA;;E');
    expect(reader.readLine(1)).toEqual([]);
    expect(reader.readLine(2)).toEqual([
      { generatedColumn: 2, sourceIndex: -1, originalLine: 0, originalColumn: 0, nameIndex: -1 },
    ]);
  });

  it('decodes lazily: a corrupt later line does not break an earlier one', () => {
    const reader = createMappingsReader('AAAA;!!!!');
    expect(reader.readLine(0)).toHaveLength(1);
    expect(() => reader.readLine(1)).toThrow(MappingsError);
    expect(() => reader.readLine(1)).toThrow(MappingsError);
    expect(reader.readLine(0)).toHaveLength(1);
  });

  it('rejects a segment with two, three or six fields', () => {
    for (const mappings of ['AA', 'AAA', 'AAAAAA']) {
      expect(() => createMappingsReader(mappings).readLine(0), mappings).toThrow(MappingsError);
    }
  });
});

describe('findSegment', () => {
  const segments = createMappingsReader(MAPPINGS).readLine(0) ?? [];

  it('finds the last segment at or before the column', () => {
    expect(findSegment(segments, 0)?.generatedColumn).toBe(0);
    expect(findSegment(segments, 24)?.generatedColumn).toBe(10);
    expect(findSegment(segments, 25)?.generatedColumn).toBe(25);
    expect(findSegment(segments, 9000)?.generatedColumn).toBe(25);
  });

  it('returns null before the first segment or on an empty line', () => {
    const second = createMappingsReader(MAPPINGS).readLine(1) ?? [];
    expect(findSegment(second, 3)).toBeNull();
    expect(findSegment([], 3)).toBeNull();
  });
});

describe('parseSourceMap', () => {
  it('loads a valid map', () => {
    expect(parseSourceMap(MAP_TEXT).ok).toBe(true);
  });

  it('names the problem of a bad file', () => {
    const problem = (text: string) => {
      const parsed = parseSourceMap(text);
      if (parsed.ok) {
        return 'none';
      }
      return parsed.problem;
    };
    expect(problem('{ not json')).toBe('invalidJson');
    expect(problem('[1, 2]')).toBe('notSourceMap');
    expect(problem(JSON.stringify({ version: 2, sources: [], mappings: '' }))).toBe(
      'unsupportedVersion',
    );
    expect(problem(JSON.stringify({ version: 3, mappings: '' }))).toBe('missingSources');
    expect(problem(JSON.stringify({ version: 3, sources: [] }))).toBe('missingMappings');
    expect(problem(JSON.stringify({ version: 3, sections: [{ offset: {} }] }))).toBe('badSection');
  });
});

describe('resolvePosition', () => {
  const map = loadMap(MAP_TEXT);

  it('turns 1-based trace positions into the original 1-based position', () => {
    expect(resolvePosition(map, 1, 1)).toMatchObject({
      status: 'resolved',
      source: 'src/app.ts',
      line: 1,
      column: 1,
      name: 'start',
    });
    expect(resolvePosition(map, 1, 11)).toMatchObject({
      source: 'src/app.ts',
      line: 3,
      column: 5,
      name: 'start',
    });
    expect(resolvePosition(map, 1, 26)).toMatchObject({
      source: 'src/util.ts',
      line: 1,
      column: 3,
      name: 'helper',
    });
    expect(resolvePosition(map, 2, 5)).toMatchObject({
      source: 'src/util.ts',
      line: 4,
      column: 1,
      name: null,
    });
  });

  it('uses the closest mapping before a column that has none of its own', () => {
    expect(resolvePosition(map, 1, 20)).toMatchObject({ line: 3, column: 5 });
  });

  it('adds a snippet of three lines around the original line', () => {
    const resolved = resolvePosition(map, 1, 11);
    expect(resolved.status === 'resolved' && resolved.snippet).toEqual({
      startLine: 2,
      lines: ['', 'start(a);', 'export {};'],
      highlightIndex: 1,
    });
  });

  it('gives no snippet when the map has no sources content', () => {
    const bare = loadMap(JSON.stringify({ ...JSON.parse(MAP_TEXT), sourcesContent: undefined }));
    const resolved = resolvePosition(bare, 1, 11);
    expect(resolved).toMatchObject({ status: 'resolved', line: 3 });
    expect(resolved.status === 'resolved' && resolved.snippet).toBeNull();
  });

  it('says why a frame cannot be resolved', () => {
    const reason = (line: number, column: number) => {
      const resolved = resolvePosition(map, line, column);
      if (resolved.status === 'unresolved') {
        return resolved.reason;
      }
      return 'resolved';
    };
    expect(reason(3, 1)).toBe('lineOutsideMap');
    expect(reason(2, 1)).toBe('noMappingAtColumn');
    expect(reason(0, 5)).toBe('invalidPosition');
    expect(reason(1, 0)).toBe('invalidPosition');
    expect(reason(1.5, 2)).toBe('invalidPosition');
  });

  it('reports a segment that points to a source the map does not list', () => {
    const missing = loadMap(JSON.stringify({ version: 3, sources: [], mappings: 'AAAA' }));
    expect(resolvePosition(missing, 1, 1)).toEqual({
      status: 'unresolved',
      reason: 'sourceMissing',
    });
  });

  it('reports corrupt mappings instead of throwing', () => {
    const broken = loadMap(JSON.stringify({ version: 3, sources: ['a.ts'], mappings: 'AAAA;!!' }));
    expect(resolvePosition(broken, 1, 1).status).toBe('resolved');
    expect(resolvePosition(broken, 2, 1)).toEqual({
      status: 'unresolved',
      reason: 'brokenMappings',
    });
  });

  it('prefixes relative sources with the source root', () => {
    const rooted = loadMap(JSON.stringify({ ...JSON.parse(MAP_TEXT), sourceRoot: 'webpack:///' }));
    expect(resolvePosition(rooted, 1, 1)).toMatchObject({ source: 'webpack:///src/app.ts' });
  });

  it('resolves through the right section of an index map', () => {
    const section = (line: number, column: number) => ({
      offset: { line, column },
      map: JSON.parse(MAP_TEXT),
    });
    const indexed = loadMap(
      JSON.stringify({ version: 3, sections: [section(0, 0), section(5, 20)] }),
    );
    expect(resolvePosition(indexed, 1, 11)).toMatchObject({ source: 'src/app.ts', line: 3 });
    // Trace column 31 is 0-based 30: column 10 of the second section, which starts at column 20.
    expect(resolvePosition(indexed, 6, 31)).toMatchObject({ source: 'src/app.ts', line: 3 });
    // A later line of the second section starts again at column 0.
    expect(resolvePosition(indexed, 7, 5)).toMatchObject({ source: 'src/util.ts', line: 4 });
  });
});

describe('snippets and paths', () => {
  it('clamps the snippet at the start and the end of the file', () => {
    expect(buildSnippet('a\nb\nc', 0)).toEqual({
      startLine: 1,
      lines: ['a', 'b'],
      highlightIndex: 0,
    });
    expect(buildSnippet('a\nb\nc', 2)).toEqual({
      startLine: 2,
      lines: ['b', 'c'],
      highlightIndex: 1,
    });
  });

  it('gives no snippet for missing content or a line past the end', () => {
    expect(buildSnippet(null, 0)).toBeNull();
    expect(buildSnippet('a', 4)).toBeNull();
  });

  it('keeps absolute sources and joins relative ones', () => {
    expect(joinSourcePath('', 'a.ts')).toBe('a.ts');
    expect(joinSourcePath('/src/', 'a.ts')).toBe('/src/a.ts');
    expect(joinSourcePath('/src', 'https://x.test/a.ts')).toBe('https://x.test/a.ts');
  });
});

describe('stack frames', () => {
  it('reads Chrome and Node frames with and without a function', () => {
    expect(parseFrameLine('    at e (https://cdn.test/min.js:1:11)')).toMatchObject({
      functionName: 'e',
      file: 'https://cdn.test/min.js',
      line: 1,
      column: 11,
    });
    expect(parseFrameLine('at https://cdn.test/min.js:2:5')).toMatchObject({
      functionName: null,
      line: 2,
      column: 5,
    });
    expect(parseFrameLine('at async new Foo (/srv/min.js:7:3)')).toMatchObject({
      functionName: 'async new Foo',
      line: 7,
    });
  });

  it('keeps a Chrome frame without a position so it can be shown as unresolved', () => {
    expect(parseFrameLine('at Array.map (<anonymous>)')).toMatchObject({
      functionName: 'Array.map',
      file: '<anonymous>',
      line: null,
      column: null,
    });
  });

  it('reads Firefox and Safari frames', () => {
    expect(parseFrameLine('e@https://cdn.test/min.js:1:11')).toMatchObject({
      functionName: 'e',
      line: 1,
      column: 11,
    });
    expect(parseFrameLine('@https://cdn.test/min.js:3:9')).toMatchObject({
      functionName: null,
      line: 3,
    });
  });

  it('skips the error message, blank lines and noise', () => {
    const trace = [
      'TypeError: x is not a function',
      '',
      '  at e (min.js:1:11)',
      'e@min.js:1:30',
    ].join('\n');
    expect(parseStackTrace(trace).map((frame) => frame.column)).toEqual([11, 30]);
    expect(parseStackTrace('just some words')).toEqual([]);
    expect(parseFrameLine('user@example.com wrote this')).toBeNull();
    expect(parseFrameLine('x'.repeat(5000))).toBeNull();
  });
});
