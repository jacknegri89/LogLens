import { describe, expect, it } from 'vitest';

import { fuzzyScore, rankByQuery } from './fuzzy';

describe('fuzzyScore', () => {
  it('matches everything for an empty query', () => {
    expect(fuzzyScore('', 'Go to Analyze')).toBe(0);
    expect(fuzzyScore('   ', 'Go to Analyze')).toBe(0);
  });

  it('matches a substring, ignoring case', () => {
    expect(fuzzyScore('ANALYZ', 'Go to Analyze')).not.toBeNull();
  });

  it('matches letters that appear in order', () => {
    expect(fuzzyScore('gta', 'Go to Analyze')).not.toBeNull();
    expect(fuzzyScore('wbv', 'Open the Workbench view')).not.toBeNull();
  });

  it('does not match when a letter is missing or out of order', () => {
    expect(fuzzyScore('xyz', 'Go to Analyze')).toBeNull();
    expect(fuzzyScore('zya', 'Go to Analyze')).toBeNull();
    expect(fuzzyScore('aaaa', 'Go to Analyze')).toBeNull();
  });

  it('ignores accents on both sides', () => {
    expect(fuzzyScore('gravita', 'Gravità')).not.toBeNull();
    expect(fuzzyScore('gravità', 'Gravita')).not.toBeNull();
  });

  it('ranks a whole substring above scattered letters', () => {
    const whole = fuzzyScore('scrub', 'Scrub the log') ?? 0;
    const scattered = fuzzyScore('scrub', 'Show cursor and clear buffer') ?? 0;
    expect(whole).toBeGreaterThan(scattered);
  });

  it('ranks an earlier or word-initial hit higher', () => {
    const early = fuzzyScore('log', 'Log viewer') ?? 0;
    const late = fuzzyScore('log', 'Open the catalog') ?? 0;
    expect(early).toBeGreaterThan(late);
  });
});

describe('rankByQuery', () => {
  const items = [
    { label: 'Go to Analyze', keywords: 'home' },
    { label: 'Go to History', keywords: 'past analyses' },
    { label: 'Sanitize the loaded log', keywords: 'anonymize privacy' },
  ];

  it('keeps all items in order for an empty query', () => {
    expect(rankByQuery(items, '')).toEqual(items);
  });

  it('filters and orders by score', () => {
    expect(rankByQuery(items, 'hist').map((item) => item.label)).toEqual(['Go to History']);
    expect(rankByQuery(items, 'go to').map((item) => item.label)).toEqual([
      'Go to Analyze',
      'Go to History',
    ]);
  });

  it('finds an item through its keywords', () => {
    expect(rankByQuery(items, 'privacy').map((item) => item.label)).toEqual([
      'Sanitize the loaded log',
    ]);
  });

  it('ranks a label hit above a keyword hit', () => {
    const ranked = rankByQuery(items, 'analy');
    expect(ranked.map((item) => item.label)).toEqual(['Go to Analyze', 'Go to History']);
  });

  it('returns nothing when nothing matches', () => {
    expect(rankByQuery(items, 'qqq')).toEqual([]);
  });

  it('does not change the list it is given', () => {
    const copy = [...items];
    rankByQuery(items, 'go');
    expect(items).toEqual(copy);
  });
});
