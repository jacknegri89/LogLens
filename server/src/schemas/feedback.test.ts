import { describe, expect, it } from 'vitest';

import { feedbackBodySchema } from './feedback';

describe('feedbackBodySchema', () => {
  it.each([true, false, null])('accepts the vote %s', (helpful) => {
    expect(feedbackBodySchema.safeParse({ helpful }).success).toBe(true);
  });

  it.each([{}, { helpful: 'yes' }, { helpful: 1 }])('refuses the body %j', (body) => {
    expect(feedbackBodySchema.safeParse(body).success).toBe(false);
  });
});
