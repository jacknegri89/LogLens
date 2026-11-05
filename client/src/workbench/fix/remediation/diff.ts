export type DiffKind = 'same' | 'removed' | 'added';

export interface DiffLine {
  kind: DiffKind;
  text: string;
}

/** A row of the side-by-side view: the old line on the left, the new line on the right. */
export interface SideBySideRow {
  left: DiffLine | null;
  right: DiffLine | null;
}

function splitLines(text: string): string[] {
  if (text === '') {
    return [];
  }
  return text.split('\n');
}

/** lengths[i][j] is the longest common run of before[i..] and after[j..]. */
function buildLengths(before: string[], after: string[]): number[][] {
  const lengths = Array.from({ length: before.length + 1 }, () =>
    new Array<number>(after.length + 1).fill(0),
  );
  for (let i = before.length - 1; i >= 0; i--) {
    for (let j = after.length - 1; j >= 0; j--) {
      if (before[i] === after[j]) {
        lengths[i][j] = lengths[i + 1][j + 1] + 1;
      } else {
        lengths[i][j] = Math.max(lengths[i + 1][j], lengths[i][j + 1]);
      }
    }
  }
  return lengths;
}

function nextKind(
  before: string[],
  after: string[],
  lengths: number[][],
  i: number,
  j: number,
): DiffKind {
  if (before[i] === after[j]) {
    return 'same';
  }
  if (lengths[i + 1][j] >= lengths[i][j + 1]) {
    return 'removed';
  }
  return 'added';
}

/** Line diff of two texts (longest common subsequence), removed lines before added ones. */
export function computeLineDiff(beforeText: string, afterText: string): DiffLine[] {
  const before = splitLines(beforeText);
  const after = splitLines(afterText);
  const lengths = buildLengths(before, after);
  const result: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < before.length && j < after.length) {
    const kind = nextKind(before, after, lengths, i, j);
    let text = before[i];
    if (kind === 'added') {
      text = after[j];
    }
    result.push({ kind, text });
    if (kind !== 'added') {
      i++;
    }
    if (kind !== 'removed') {
      j++;
    }
  }
  const removedTail = before.slice(i).map((text) => ({ kind: 'removed' as const, text }));
  const addedTail = after.slice(j).map((text) => ({ kind: 'added' as const, text }));
  return [...result, ...removedTail, ...addedTail];
}

const UNIFIED_PREFIX: Record<DiffKind, string> = { same: ' ', removed: '-', added: '+' };

/** The diff as plain text: a one-line header, then every line with its space, minus or plus. */
export function toUnifiedText(diff: DiffLine[]): string {
  const body = diff.map((line) => UNIFIED_PREFIX[line.kind] + line.text);
  return ['--- before', '+++ after', ...body].join('\n');
}

function pairBlocks(removed: DiffLine[], added: DiffLine[]): SideBySideRow[] {
  const height = Math.max(removed.length, added.length);
  return Array.from({ length: height }, (_, row) => ({
    left: removed[row] ?? null,
    right: added[row] ?? null,
  }));
}

/** Pairs each block of removed lines with the block of added lines that follows it. */
export function toSideBySideRows(diff: DiffLine[]): SideBySideRow[] {
  const rows: SideBySideRow[] = [];
  let removed: DiffLine[] = [];
  let added: DiffLine[] = [];
  for (const line of diff) {
    if (line.kind !== 'same') {
      if (line.kind === 'removed') {
        removed.push(line);
      } else {
        added.push(line);
      }
      continue;
    }
    rows.push(...pairBlocks(removed, added), { left: line, right: line });
    removed = [];
    added = [];
  }
  return [...rows, ...pairBlocks(removed, added)];
}
