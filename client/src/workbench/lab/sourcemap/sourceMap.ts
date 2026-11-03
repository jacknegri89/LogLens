import { createMappingsReader, type MappingsReader } from './mappings';

/** One v3 map, ready to be searched. The mappings are decoded only when a line is asked for. */
export interface MapData {
  sources: string[];
  names: string[];
  sourcesContent: Array<string | null>;
  sourceRoot: string;
  reader: MappingsReader;
}

export interface MapSection {
  /** Where the section starts in the generated file, 0-based. */
  line: number;
  column: number;
  map: MapData;
}

/** A plain map is one section at 0:0; an index map has several. */
export interface LoadedSourceMap {
  sections: MapSection[];
}

export type SourceMapProblem =
  | 'invalidJson'
  | 'notSourceMap'
  | 'unsupportedVersion'
  | 'missingSources'
  | 'missingMappings'
  | 'badSection';

export type ParsedSourceMap =
  | { ok: true; map: LoadedSourceMap }
  | { ok: false; problem: SourceMapProblem };

type Json = Record<string, unknown>;

function isObject(value: unknown): value is Json {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asStrings(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  return value.map((item) => (typeof item === 'string' ? item : ''));
}

function asContents(value: unknown, count: number): Array<string | null> {
  const contents = Array.isArray(value) ? value : [];
  return Array.from({ length: count }, (_, index) =>
    typeof contents[index] === 'string' ? (contents[index] as string) : null,
  );
}

function toMapData(json: Json): MapData | SourceMapProblem {
  const sources = asStrings(json.sources);
  if (!sources) return 'missingSources';
  if (typeof json.mappings !== 'string') return 'missingMappings';
  return {
    sources,
    names: asStrings(json.names) ?? [],
    sourcesContent: asContents(json.sourcesContent, sources.length),
    sourceRoot: typeof json.sourceRoot === 'string' ? json.sourceRoot : '',
    reader: createMappingsReader(json.mappings),
  };
}

function toSection(entry: unknown): MapSection | SourceMapProblem {
  if (!isObject(entry) || !isObject(entry.offset) || !isObject(entry.map)) return 'badSection';
  const { line, column } = entry.offset;
  if (typeof line !== 'number' || typeof column !== 'number') return 'badSection';
  const map = toMapData(entry.map);
  return typeof map === 'string' ? map : { line, column, map };
}

function toIndexMap(sections: unknown[]): ParsedSourceMap {
  const loaded: MapSection[] = [];
  for (const entry of sections) {
    const section = toSection(entry);
    if (typeof section === 'string') return { ok: false, problem: section };
    loaded.push(section);
  }
  loaded.sort((first, second) => first.line - second.line || first.column - second.column);
  return { ok: true, map: { sections: loaded } };
}

function parseJsonMap(json: Json): ParsedSourceMap {
  if (json.version !== 3) return { ok: false, problem: 'unsupportedVersion' };
  if (Array.isArray(json.sections)) return toIndexMap(json.sections);
  const data = toMapData(json);
  if (typeof data === 'string') return { ok: false, problem: data };
  return { ok: true, map: { sections: [{ line: 0, column: 0, map: data }] } };
}

/** Reads a source map file (version 3, plain or index map). It never throws. */
export function parseSourceMap(text: string): ParsedSourceMap {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return { ok: false, problem: 'invalidJson' };
  }
  return isObject(value) ? parseJsonMap(value) : { ok: false, problem: 'notSourceMap' };
}
