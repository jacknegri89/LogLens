import { describe, expect, it } from 'vitest';

import { buildRegex, DEFAULT_FLAGS, flagsToText, looksCatastrophic } from './regexBuild';

describe('buildRegex', () => {
  it('reports an empty pattern without building anything', () => {
    expect(buildRegex('', DEFAULT_FLAGS)).toEqual({ status: 'empty' });
  });

  it('builds a global regex with the chosen flags', () => {
    const build = buildRegex('err(or)?', { ...DEFAULT_FLAGS, multiline: true, dotAll: true });
    expect(build.status).toBe('ready');
    if (build.status === 'ready') {
      expect(build.regex.flags).toBe('gims');
      expect(build.firstMatchOnly).toBe(false);
    }
  });

  it('asks for the first match only when the g flag is off', () => {
    const build = buildRegex('a', { ...DEFAULT_FLAGS, global: false });
    expect(build.status === 'ready' && build.firstMatchOnly).toBe(true);
  });

  it('turns an invalid pattern into a message and never throws', () => {
    for (const pattern of ['(', '[a-', '*abc', '\\', '(?<n>a)(?<n>b)']) {
      const build = buildRegex(pattern, DEFAULT_FLAGS);
      expect(build.status, pattern).toBe('invalid');
      expect(build.status === 'invalid' && build.message.length).toBeGreaterThan(0);
    }
  });

  it('refuses patterns whose nested repeats can freeze the page', () => {
    for (const pattern of ['(a+)+$', '(\\w+\\s?)*', '(.*)*x', '(a*){2,}']) {
      expect(buildRegex(pattern, DEFAULT_FLAGS).status, pattern).toBe('risky');
    }
  });

  it('keeps ordinary groups and repeats', () => {
    for (const pattern of ['(ab)+', '(?:error|warn)\\s+\\d+', '\\d+(?:\\.\\d+)?ms', '(a|b)*c']) {
      expect(looksCatastrophic(pattern), pattern).toBe(false);
    }
  });
});

describe('flagsToText', () => {
  it('lists only the flags that are on, without g', () => {
    expect(flagsToText({ ignoreCase: false, global: true, multiline: true, dotAll: false })).toBe(
      'm',
    );
    expect(flagsToText({ ignoreCase: false, global: false, multiline: false, dotAll: false })).toBe(
      '',
    );
  });
});
