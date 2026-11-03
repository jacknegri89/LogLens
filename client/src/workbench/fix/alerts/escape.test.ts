import { describe, expect, it } from 'vitest';

import { doubleQuoted, neutralizeMentions, neutralizeTemplates, shellSingleQuoted } from './escape';

describe('doubleQuoted', () => {
  it('wraps plain text in quotes without changing it', () => {
    expect(doubleQuoted('connection refused')).toBe('"connection refused"');
  });

  it.each(['say "hi"', 'back\\slash', 'a\nb', 'tab\there', 'bell\u0007', 'sep x', 'del\u007f'])(
    'round-trips %j through a JSON parser',
    (value) => {
      expect(JSON.parse(doubleQuoted(value))).toBe(value);
    },
  );

  it('never leaves a raw line break or control character in the output', () => {
    const output = doubleQuoted('a\nb\rc d\u0085e');
    for (const character of ['\n', '\r', ' ', '\u0085']) {
      expect(output.includes(character), JSON.stringify(character)).toBe(false);
    }
  });

  it('keeps non-ASCII letters as they are', () => {
    expect(doubleQuoted('connessione è caduta')).toBe('"connessione è caduta"');
  });
});

describe('shellSingleQuoted', () => {
  it('wraps plain text in single quotes', () => {
    expect(shellSingleQuoted('error 500')).toBe("'error 500'");
  });

  it('closes, escapes and reopens the quote for every single quote inside', () => {
    expect(shellSingleQuoted("it's")).toBe("'it'\\''s'");
  });

  it('leaves substitutions inside the quotes where the shell does not run them', () => {
    expect(shellSingleQuoted('$(id) `id` ${HOME}')).toBe("'$(id) `id` ${HOME}'");
  });
});

describe('neutralizeTemplates', () => {
  it.each(['{{ .Secret }}', '{{{x}}}', 'a{{b}}c}}'])('breaks every double brace in %s', (value) => {
    expect(neutralizeTemplates(value)).not.toMatch(/\{\{|\}\}/);
  });

  it('leaves single braces alone', () => {
    expect(neutralizeTemplates('{"a": 1}')).toBe('{"a": 1}');
  });
});

describe('neutralizeMentions', () => {
  it('removes every @ so nobody gets notified', () => {
    expect(neutralizeMentions('@oncall and a@b.c')).not.toContain('@');
  });
});
