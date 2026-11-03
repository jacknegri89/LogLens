/** One decoded entry of a source map line. Columns and lines are 0-based, as in the map itself. */
export interface MappingSegment {
  generatedColumn: number;
  /** -1 when the segment only marks the end of mapped code and points to no source. */
  sourceIndex: number;
  originalLine: number;
  originalColumn: number;
  /** -1 when the segment has no name. */
  nameIndex: number;
}

export interface MappingsReader {
  /**
   * The segments of a generated line (0-based), or null when the map has fewer lines.
   * Throws MappingsError when the mappings text is corrupt up to that line.
   */
  readLine: (generatedLine: number) => MappingSegment[] | null;
}

export class MappingsError extends Error {}

const BASE64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const BASE64_VALUES = new Int8Array(128).fill(-1);
for (let index = 0; index < BASE64_ALPHABET.length; index += 1) {
  BASE64_VALUES[BASE64_ALPHABET.charCodeAt(index)] = index;
}

const CONTINUATION_BIT = 32;
const VALUE_MASK = 31;
const BITS_PER_DIGIT = 5;
/** 32 bits of value need seven base64 digits; more means corrupt data and not a big number. */
const MAX_DIGITS = 7;

interface Cursor {
  text: string;
  position: number;
}

/** Reads one base64 VLQ number and moves the cursor past it. */
export function readVlq(cursor: Cursor): number {
  let magnitude = 0;
  for (let digits = 0; digits < MAX_DIGITS; digits += 1) {
    const code = cursor.text.charCodeAt(cursor.position);
    const digit = code < 128 ? BASE64_VALUES[code] : -1;
    if (digit < 0) throw new MappingsError(`Bad mappings character at ${cursor.position}`);
    cursor.position += 1;
    magnitude += (digit & VALUE_MASK) * 2 ** (digits * BITS_PER_DIGIT);
    if ((digit & CONTINUATION_BIT) === 0) {
      // The lowest bit is the sign; adding 0 turns -0 into 0.
      return (magnitude % 2 === 1 ? -((magnitude - 1) / 2) : magnitude / 2) + 0;
    }
  }
  throw new MappingsError('Mappings number is too long');
}

/** The values that carry over from one segment to the next, across lines too. */
interface DecoderState {
  cursor: Cursor;
  sourceIndex: number;
  originalLine: number;
  originalColumn: number;
  nameIndex: number;
}

function hasMoreFields(cursor: Cursor, lineEnd: number): boolean {
  return cursor.position < lineEnd && cursor.text[cursor.position] !== ',';
}

function readRequiredField(state: DecoderState, lineEnd: number): number {
  if (!hasMoreFields(state.cursor, lineEnd)) throw new MappingsError('Segment has too few fields');
  return readVlq(state.cursor);
}

function readSegment(
  state: DecoderState,
  generatedColumn: number,
  lineEnd: number,
): MappingSegment {
  if (!hasMoreFields(state.cursor, lineEnd)) {
    return { generatedColumn, sourceIndex: -1, originalLine: 0, originalColumn: 0, nameIndex: -1 };
  }
  state.sourceIndex += readVlq(state.cursor);
  state.originalLine += readRequiredField(state, lineEnd);
  state.originalColumn += readRequiredField(state, lineEnd);
  let nameIndex = -1;
  if (hasMoreFields(state.cursor, lineEnd)) {
    state.nameIndex += readVlq(state.cursor);
    nameIndex = state.nameIndex;
  }
  const { sourceIndex, originalLine, originalColumn } = state;
  return { generatedColumn, sourceIndex, originalLine, originalColumn, nameIndex };
}

function readLineSegments(state: DecoderState, lineEnd: number): MappingSegment[] {
  const segments: MappingSegment[] = [];
  let generatedColumn = 0;
  while (state.cursor.position < lineEnd) {
    generatedColumn += readVlq(state.cursor);
    segments.push(readSegment(state, generatedColumn, lineEnd));
    if (state.cursor.position >= lineEnd) break;
    if (state.cursor.text[state.cursor.position] !== ',') {
      throw new MappingsError('Segment has too many fields');
    }
    state.cursor.position += 1;
  }
  return segments;
}

/** The decoder plus what it has produced so far, so a later lookup continues where the last ended. */
interface ReaderState extends DecoderState {
  lines: MappingSegment[][];
  finished: boolean;
  failure: MappingsError | null;
}

function decodeNextLine(reader: ReaderState): void {
  const { cursor } = reader;
  const separator = cursor.text.indexOf(';', cursor.position);
  const lineEnd = separator === -1 ? cursor.text.length : separator;
  reader.lines.push(readLineSegments(reader, lineEnd));
  if (separator === -1) reader.finished = true;
  else cursor.position = separator + 1;
}

/** A corrupt line stays corrupt: the failure is kept, and lines decoded before it stay usable. */
function decodeUntil(reader: ReaderState, generatedLine: number): void {
  if (reader.failure) throw reader.failure;
  try {
    while (reader.lines.length <= generatedLine && !reader.finished) decodeNextLine(reader);
  } catch (error) {
    reader.failure = error instanceof MappingsError ? error : new MappingsError(String(error));
    throw reader.failure;
  }
}

function readDecodedLine(reader: ReaderState, generatedLine: number): MappingSegment[] | null {
  if (generatedLine < 0) return null;
  if (reader.lines.length <= generatedLine) decodeUntil(reader, generatedLine);
  return reader.lines[generatedLine] ?? null;
}

/**
 * Decodes the "mappings" text one generated line at a time, only as far as a lookup needs.
 * Source, line, column and name are relative to the previous segment of the whole file,
 * so a line can only be decoded after the lines before it.
 */
export function createMappingsReader(mappings: string): MappingsReader {
  const reader: ReaderState = {
    cursor: { text: mappings, position: 0 },
    sourceIndex: 0,
    originalLine: 0,
    originalColumn: 0,
    nameIndex: 0,
    lines: [],
    finished: false,
    failure: null,
  };
  return { readLine: (generatedLine) => readDecodedLine(reader, generatedLine) };
}

/** The last segment that starts at or before the column (binary search), or null before the first. */
export function findSegment(
  segments: readonly MappingSegment[],
  generatedColumn: number,
): MappingSegment | null {
  let low = 0;
  let high = segments.length - 1;
  let found: MappingSegment | null = null;
  while (low <= high) {
    const middle = (low + high) >> 1;
    if (segments[middle].generatedColumn <= generatedColumn) {
      found = segments[middle];
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }
  return found;
}
