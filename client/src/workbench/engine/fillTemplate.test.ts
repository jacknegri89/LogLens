import { describe, expect, it } from 'vitest';

import { fillTemplate } from './fillTemplate';

describe('fillTemplate', () => {
  it('replaces every placeholder, also when one repeats', () => {
    expect(fillTemplate('{a} and {b} and {a}', { a: 'x', b: 2 })).toBe('x and 2 and x');
  });

  it('leaves a placeholder without a value as it is', () => {
    expect(fillTemplate('Hello {name}', {})).toBe('Hello {name}');
  });

  it('does not run values that look like placeholders again', () => {
    expect(fillTemplate('{a}', { a: '{b}', b: 'no' })).toBe('{b}');
  });

  it('keeps text without placeholders unchanged', () => {
    expect(fillTemplate('plain {} text', { a: 1 })).toBe('plain {} text');
  });

  it('inserts markup-looking values as plain text', () => {
    expect(fillTemplate('{a}', { a: '<b>x</b>' })).toBe('<b>x</b>');
  });
});
