import { describe, expect, it } from 'vitest';

import { ERROR_TEXT } from '../content/errors';
import { LANGUAGES } from '../i18n/languages';
import { errorMessage } from './errors';
import { RequestError } from './requestError';

describe('errorMessage', () => {
  it.each(LANGUAGES)('keeps what the server said (%s)', (language) => {
    const failure = new RequestError(400, 'Log is empty');
    expect(errorMessage(failure, 'fallback', ERROR_TEXT[language])).toBe('Log is empty');
  });

  it('writes the status in the page language when the server said nothing', () => {
    const failure = new RequestError(502);
    expect(errorMessage(failure, 'fallback', ERROR_TEXT.en)).toBe('Request failed (502)');
    expect(errorMessage(failure, 'fallback', ERROR_TEXT.it)).toBe('Richiesta non riuscita (502)');
  });

  it('explains an unreachable server in the page language', () => {
    const failure = new TypeError('Failed to fetch');
    expect(errorMessage(failure, 'fallback', ERROR_TEXT.it)).toBe(ERROR_TEXT.it.unreachable);
    expect(errorMessage(failure, 'fallback', ERROR_TEXT.en)).toBe(ERROR_TEXT.en.unreachable);
  });

  it('uses the fallback for a failure that is not an Error', () => {
    expect(errorMessage('boom', 'fallback', ERROR_TEXT.en)).toBe('fallback');
  });
});
