import { describe, expect, it } from 'vitest';

import { pageKeyForPath } from './pageKey';

describe('pageKeyForPath', () => {
  it.each([
    ['/', 'home'],
    ['/workbench', 'workbench'],
    ['/workbench/', 'workbench'],
    ['/history', 'history'],
    ['/privacy', 'privacy'],
    ['/analyses/abc123', 'analysis'],
    ['/shared/some-token', 'shared'],
  ])('maps %s to %s', (path, expected) => {
    expect(pageKeyForPath(path)).toBe(expected);
  });

  it('treats any other path as not found', () => {
    expect(pageKeyForPath('/nothing-here')).toBe('notFound');
    expect(pageKeyForPath('/analyses')).toBe('notFound');
  });
});
