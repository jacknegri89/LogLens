const CONSECUTIVE_BONUS = 4;
const WORD_START_BONUS = 3;
const SUBSTRING_BONUS = 100;

// "è" and "e" count as the same letter, so Italian text can be typed without accents.
function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

function isWordStart(text: string, index: number): boolean {
  return index === 0 || /[\s\-_:./]/.test(text[index - 1]);
}

/** Score of a loose in-order match of `query` letters, or null when a letter is missing. */
function subsequenceScore(query: string, text: string): number | null {
  let score = 0;
  let position = 0;
  let previousMatch = -2;
  for (const letter of query) {
    const found = text.indexOf(letter, position);
    if (found === -1) {
      return null;
    }
    score += 1;
    if (found === previousMatch + 1) {
      score += CONSECUTIVE_BONUS;
    }
    if (isWordStart(text, found)) {
      score += WORD_START_BONUS;
    }
    previousMatch = found;
    position = found + 1;
  }
  return score;
}

/**
 * How well `query` matches `text`: null for no match, higher for a better one. A whole substring
 * beats scattered letters, and an earlier or word-initial hit beats a later one.
 */
export function fuzzyScore(query: string, text: string): number | null {
  const wanted = normalize(query).replace(/\s+/g, '');
  const haystack = normalize(text);
  if (wanted === '') {
    return 0;
  }
  const direct = haystack.indexOf(normalize(query).trim());
  if (direct !== -1) {
    let wordStartBonus = 0;
    if (isWordStart(haystack, direct)) {
      wordStartBonus = WORD_START_BONUS;
    }
    return SUBSTRING_BONUS - Math.min(direct, 50) + wordStartBonus;
  }
  return subsequenceScore(wanted, haystack);
}

export interface Searchable {
  label: string;
  keywords: string;
}

/** The items that match, best first; ties keep their original order. An empty query keeps everything. */
export function rankByQuery<Item extends Searchable>(
  items: readonly Item[],
  query: string,
): Item[] {
  if (query.trim() === '') {
    return [...items];
  }
  const scored = items.flatMap((item, order) => {
    const labelScore = fuzzyScore(query, item.label);
    const keywordScore = fuzzyScore(query, item.keywords);
    let adjustedKeywordScore = -Infinity;
    if (keywordScore !== null) {
      adjustedKeywordScore = keywordScore - 30;
    }
    const best = Math.max(labelScore ?? -Infinity, adjustedKeywordScore);
    if (best === -Infinity) {
      return [];
    }
    return [{ item, best, order }];
  });
  scored.sort((left, right) => right.best - left.best || left.order - right.order);
  return scored.map((entry) => entry.item);
}
