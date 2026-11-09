import 'dotenv/config';

import { z } from 'zod';

/**
 * The environment variables the server needs, with validation and defaults.
 *
 * Why validate here? So the app "fails fast": if a variable is missing or has
 * the wrong shape, we stop at startup with a clear message — instead of
 * crashing later, deep inside a request, with a confusing error.
 *
 * We only declare the variables this phase actually uses. AI- and database-
 * related variables are added in their own phases.
 */
const DEFAULT_VISITOR_SALT = 'loglens';
/** A salt shorter or poorer than this makes the stored address hashes easy to reverse. */
const MIN_PRODUCTION_SALT_LENGTH = 16;
const MIN_PRODUCTION_SALT_DISTINCT_CHARACTERS = 8;

function isWeakSalt(salt: string): boolean {
  if (salt === DEFAULT_VISITOR_SALT || salt.length < MIN_PRODUCTION_SALT_LENGTH) {
    return true;
  }
  return new Set(salt).size < MIN_PRODUCTION_SALT_DISTINCT_CHARACTERS;
}

/** An origin is scheme, host and optional port: "https://app.example.com", with no path. */
function isValidOrigin(value: string): boolean {
  try {
    const url = new URL(value);
    return (url.protocol === 'https:' || url.protocol === 'http:') && url.origin === value;
  } catch {
    return false;
  }
}

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(3001),
    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required (see .env.example)'),

    // Which AI engine analyzes the logs. When it is missing, development and tests use the mock;
    // production refuses to start without an explicit choice (see the rules at the end).
    AI_PROVIDER: z.enum(['mock', 'rules', 'openai', 'hybrid', 'ollama']).optional(),
    // The mock answers with canned text, not with an analysis. Production allows it only on purpose.
    ALLOW_MOCK_PROVIDER: z
      .enum(['true', 'false'])
      .default('false')
      .transform((value) => value === 'true'),

    // OpenAI (used when AI_PROVIDER=openai, or for unknown logs when AI_PROVIDER=hybrid)
    OPENAI_API_KEY: z.string().optional(),
    OPENAI_MODEL: z.string().default('gpt-4o-mini'),

    // Cost protection for AI calls. On by default: a public server must not run up
    // an API bill for anyone who asks. 0 turns a limit off, for local use only.
    RATE_LIMIT_PER_HOUR: z.coerce.number().int().min(0).default(5),
    GLOBAL_LIMIT_PER_HOUR: z.coerce.number().int().min(0).default(100),
    // Requests per minute that one address may send to the whole API (0 turns the limit off).
    // It is counted in each server instance's memory, so it is a first barrier against bursts.
    API_RATE_LIMIT_PER_MINUTE: z.coerce.number().int().min(0).default(120),
    VISITOR_SALT: z.string().default(DEFAULT_VISITOR_SALT),
    // Secret that Vercel Cron sends as "Authorization: Bearer <CRON_SECRET>". Without it, the
    // scheduled cleanup refuses every call, so nobody else can trigger it.
    CRON_SECRET: z.string().min(16).optional(),
    // Set to true only behind a reverse proxy (Vercel, nginx) that sets X-Forwarded-For.
    TRUST_PROXY: z
      .enum(['true', 'false'])
      .default('false')
      .transform((value) => value === 'true'),

    // Allowed CORS origin for the frontend. Defaults to * (all) in dev.
    CORS_ORIGIN: z.string().default('*'),

    // Ollama (used when AI_PROVIDER=ollama)
    OLLAMA_BASE_URL: z.string().url().default('http://localhost:11434'),
    OLLAMA_MODEL: z.string().default('llama3.2'),

    // Analysis budget. The deterministic engine reads every event it acquires; these limits say how
    // much of a log is selected for the report and how much is sent to a model.
    // Events kept for the analysis after the contextual selection.
    ANALYSIS_MAX_SELECTED_EVENTS: z.coerce.number().int().min(10).max(20_000).default(1500),
    // Size of the context sent to a model, in characters and in events.
    AI_CONTEXT_MAX_CHARS: z.coerce.number().int().min(2000).max(200_000).default(24_000),
    AI_CONTEXT_MAX_EVENTS: z.coerce.number().int().min(10).max(2000).default(250),
    // Model calls allowed for one analysis (0 turns the model off even in openai or hybrid mode).
    AI_MAX_CALLS_PER_ANALYSIS: z.coerce.number().int().min(0).max(3).default(1),
    // Highest estimated cost of one analysis, in US dollars. A call that could cost more is skipped
    // and the report says the rules answered instead.
    AI_MAX_COST_USD_PER_ANALYSIS: z.coerce.number().min(0).max(10).default(0.05),
    // Prices used for the estimate, in US dollars per million tokens.
    AI_INPUT_USD_PER_MILLION_TOKENS: z.coerce.number().min(0).default(0.15),
    AI_OUTPUT_USD_PER_MILLION_TOKENS: z.coerce.number().min(0).default(0.6),
    // How long a model call may take before the rules answer instead.
    AI_TIMEOUT_MS: z.coerce.number().int().min(1000).max(60_000).default(40_000),
  })
  .superRefine((value, ctx) => {
    // Conditional rule: OpenAI needs a key, but only when it's the chosen provider.
    const usesOpenAI = value.AI_PROVIDER === 'openai' || value.AI_PROVIDER === 'hybrid';
    if (usesOpenAI && !value.OPENAI_API_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['OPENAI_API_KEY'],
        message: `OPENAI_API_KEY is required when AI_PROVIDER=${value.AI_PROVIDER}`,
      });
    }
    if (value.NODE_ENV !== 'production') {
      return;
    }
    // Production rules: a mistake here must stop the server at startup, not show up later as a
    // demo that answers with canned text or hashes with a salt everybody knows.
    if (value.AI_PROVIDER === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['AI_PROVIDER'],
        message: 'AI_PROVIDER must be set in production (rules, hybrid, openai or ollama).',
      });
    }
    if (value.AI_PROVIDER === 'mock' && !value.ALLOW_MOCK_PROVIDER) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['AI_PROVIDER'],
        message:
          'AI_PROVIDER=mock returns canned text, not an analysis. Use another provider, or set ALLOW_MOCK_PROVIDER=true on purpose.',
      });
    }
    if (isWeakSalt(value.VISITOR_SALT)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['VISITOR_SALT'],
        message: `VISITOR_SALT must be set in production to a random secret of at least ${MIN_PRODUCTION_SALT_LENGTH} characters (not the default).`,
      });
    }
    const corsIsOpen = value.CORS_ORIGIN === '' || value.CORS_ORIGIN === '*';
    if (!corsIsOpen && !isValidOrigin(value.CORS_ORIGIN)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['CORS_ORIGIN'],
        message:
          'CORS_ORIGIN must be one origin such as https://app.example.com (no path, no slash).',
      });
    }
  })
  .transform((value) => ({ ...value, AI_PROVIDER: value.AI_PROVIDER ?? ('mock' as const) }));

export type Env = z.infer<typeof envSchema>;

/** Validates a set of variables. Exported so the rules can be tested without starting the server. */
export function parseEnv(source: Record<string, string | undefined>) {
  return envSchema.safeParse(source);
}

/** Settings that do not stop the server but weaken it. Printed once at startup in production. */
export function productionWarnings(value: Env): string[] {
  const warnings: string[] = [];
  if (value.NODE_ENV !== 'production') {
    return warnings;
  }
  if (!value.TRUST_PROXY) {
    warnings.push(
      'TRUST_PROXY is false: behind a proxy such as Vercel every visitor shares one address, so the per-address limits apply to everybody together. Set TRUST_PROXY=true behind a proxy you control.',
    );
  }
  if (!value.CRON_SECRET) {
    warnings.push(
      'CRON_SECRET is not set: the scheduled cleanup refuses every call, so analyses are not deleted after the retention period.',
    );
  }
  return warnings;
}

const parsed = parseEnv(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

for (const warning of productionWarnings(env)) {
  console.warn(`Configuration warning: ${warning}`);
}
