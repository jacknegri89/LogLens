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
const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(3001),
    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required (see .env.example)'),

    // Which AI engine analyzes the logs.
    AI_PROVIDER: z.enum(['mock', 'rules', 'openai', 'hybrid', 'ollama']).default('mock'),

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
    VISITOR_SALT: z.string().default('loglens'),
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
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
