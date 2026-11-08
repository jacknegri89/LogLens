import { describe, expect, it } from 'vitest';

import { parseEnv, productionWarnings } from './env';

const DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
const STRONG_SALT = 'x7Qm2pLk9RtVb4Nz8WcY';

/** A production configuration that is valid; each test breaks one thing. */
function production(overrides: Record<string, string | undefined> = {}) {
  return {
    NODE_ENV: 'production',
    DATABASE_URL,
    AI_PROVIDER: 'rules',
    VISITOR_SALT: STRONG_SALT,
    TRUST_PROXY: 'true',
    CORS_ORIGIN: 'https://loglens.example.com',
    CRON_SECRET: 'a-long-random-cron-secret',
    ...overrides,
  };
}

function problemsOf(source: Record<string, string | undefined>): string[] {
  const result = parseEnv(source);
  if (result.success) {
    return [];
  }
  return Object.keys(result.error.flatten().fieldErrors);
}

describe('local development', () => {
  it('needs only a database url and uses the mock provider by default', () => {
    const result = parseEnv({ DATABASE_URL });

    expect(result.success).toBe(true);
    expect(result.data?.AI_PROVIDER).toBe('mock');
    expect(result.data?.NODE_ENV).toBe('development');
  });

  it('accepts the default salt and an open CORS origin', () => {
    expect(parseEnv({ DATABASE_URL, CORS_ORIGIN: '*' }).success).toBe(true);
  });

  it('still requires an OpenAI key for the openai and hybrid providers', () => {
    expect(problemsOf({ DATABASE_URL, AI_PROVIDER: 'hybrid' })).toContain('OPENAI_API_KEY');
  });
});

describe('production', () => {
  it('accepts a complete configuration', () => {
    expect(parseEnv(production()).success).toBe(true);
  });

  it('refuses to start without an explicit AI_PROVIDER', () => {
    expect(problemsOf(production({ AI_PROVIDER: undefined }))).toEqual(['AI_PROVIDER']);
  });

  it('refuses the mock provider unless it is allowed on purpose', () => {
    expect(problemsOf(production({ AI_PROVIDER: 'mock' }))).toEqual(['AI_PROVIDER']);
    expect(parseEnv(production({ AI_PROVIDER: 'mock', ALLOW_MOCK_PROVIDER: 'true' })).success).toBe(
      true,
    );
  });

  it.each([
    ['the default', undefined],
    ['the example value', 'change-me'],
    ['a short value', 'short-salt-1'],
    ['a repeated character', 'aaaaaaaaaaaaaaaaaaaa'],
  ])('refuses a weak VISITOR_SALT: %s', (_label, salt) => {
    expect(problemsOf(production({ VISITOR_SALT: salt }))).toEqual(['VISITOR_SALT']);
  });

  it.each(['https://loglens.example.com/', 'https://loglens.example.com/app', 'not a url'])(
    'refuses a CORS_ORIGIN that is not a plain origin: %s',
    (origin) => {
      expect(problemsOf(production({ CORS_ORIGIN: origin }))).toEqual(['CORS_ORIGIN']);
    },
  );

  it('does not print the values it refused', () => {
    const result = parseEnv(production({ VISITOR_SALT: 'change-me' }));

    expect(JSON.stringify(result.error?.flatten())).not.toContain('change-me');
  });

  it('warns about settings that weaken the server without stopping it', () => {
    const result = parseEnv(production({ TRUST_PROXY: 'false', CRON_SECRET: undefined }));
    expect(result.success).toBe(true);
    if (!result.success) {
      return;
    }

    const warnings = productionWarnings(result.data);

    expect(warnings).toHaveLength(2);
    expect(warnings.join(' ')).toContain('TRUST_PROXY');
    expect(warnings.join(' ')).toContain('CRON_SECRET');
  });

  it('has nothing to warn about in a complete configuration', () => {
    const result = parseEnv(production());
    expect(result.success && productionWarnings(result.data)).toEqual([]);
  });
});
