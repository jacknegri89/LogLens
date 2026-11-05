import { findSegment, MappingsError, MappingsLimitError } from './mappings';
import type { LoadedSourceMap, MapData, MapSection } from './sourceMap';

export interface SourceSnippet {
  /** 1-based number of the first listed line. */
  startLine: number;
  lines: string[];
  /** Position of the frame's own line inside `lines`. */
  highlightIndex: number;
}

export type UnresolvedReason =
  | 'noPosition'
  | 'invalidPosition'
  | 'lineOutsideMap'
  | 'noMappingAtColumn'
  | 'sourceMissing'
  | 'mapTooLarge'
  | 'brokenMappings';

export type Resolution =
  | {
      status: 'resolved';
      source: string;
      /** 1-based, like the lines of a stack trace. */
      line: number;
      column: number;
      name: string | null;
      snippet: SourceSnippet | null;
    }
  | { status: 'unresolved'; reason: UnresolvedReason };

const SNIPPET_CONTEXT_LINES = 1;
const MAX_SNIPPET_LINE_LENGTH = 200;

/** `sourceRoot` is a prefix for relative source names. */
export function joinSourcePath(root: string, source: string): string {
  if (root === '' || /^([a-z]+:)?\//i.test(source)) {
    return source;
  }
  if (root.endsWith('/')) {
    return `${root}${source}`;
  }
  return `${root}/${source}`;
}

export function buildSnippet(content: string | null, originalLine: number): SourceSnippet | null {
  if (content === null) {
    return null;
  }
  const sourceLines = content.split(/\r?\n/);
  if (originalLine < 0 || originalLine >= sourceLines.length) {
    return null;
  }
  const first = Math.max(0, originalLine - SNIPPET_CONTEXT_LINES);
  const last = Math.min(sourceLines.length - 1, originalLine + SNIPPET_CONTEXT_LINES);
  return {
    startLine: first + 1,
    lines: sourceLines.slice(first, last + 1).map((line) => line.slice(0, MAX_SNIPPET_LINE_LENGTH)),
    highlightIndex: originalLine - first,
  };
}

/** The section that starts last at or before the position. */
function findSection(map: LoadedSourceMap, line: number, column: number): MapSection | null {
  let found: MapSection | null = null;
  for (const section of map.sections) {
    const starts = section.line < line || (section.line === line && section.column <= column);
    if (starts) {
      found = section;
    }
  }
  return found;
}

function lookUp(data: MapData, generatedLine: number, generatedColumn: number): Resolution {
  const segments = data.reader.readLine(generatedLine);
  if (!segments) {
    return { status: 'unresolved', reason: 'lineOutsideMap' };
  }
  const segment = findSegment(segments, generatedColumn);
  if (!segment || segment.sourceIndex < 0) {
    return { status: 'unresolved', reason: 'noMappingAtColumn' };
  }
  const source = data.sources[segment.sourceIndex];
  if (source === undefined) {
    return { status: 'unresolved', reason: 'sourceMissing' };
  }
  let name: string | null = null;
  if (segment.nameIndex >= 0) {
    name = data.names[segment.nameIndex] ?? null;
  }
  return {
    status: 'resolved',
    source: joinSourcePath(data.sourceRoot, source),
    line: segment.originalLine + 1,
    column: segment.originalColumn + 1,
    name,
    snippet: buildSnippet(data.sourcesContent[segment.sourceIndex], segment.originalLine),
  };
}

/**
 * Finds where a position of the generated file comes from. Stack traces count lines and columns
 * from 1 and the map counts from 0, so both are shifted here and shifted back in the answer.
 */
export function resolvePosition(map: LoadedSourceMap, line: number, column: number): Resolution {
  if (!Number.isInteger(line) || !Number.isInteger(column) || line < 1 || column < 1) {
    return { status: 'unresolved', reason: 'invalidPosition' };
  }
  const generatedLine = line - 1;
  const generatedColumn = column - 1;
  const section = findSection(map, generatedLine, generatedColumn);
  if (!section) {
    return { status: 'unresolved', reason: 'lineOutsideMap' };
  }
  const sameLine = generatedLine === section.line;
  let sectionColumn = generatedColumn;
  if (sameLine) {
    sectionColumn -= section.column;
  }
  try {
    return lookUp(section.map, generatedLine - section.line, sectionColumn);
  } catch (error) {
    if (error instanceof MappingsLimitError) {
      return { status: 'unresolved', reason: 'mapTooLarge' };
    }
    if (error instanceof MappingsError) {
      return { status: 'unresolved', reason: 'brokenMappings' };
    }
    throw error;
  }
}
