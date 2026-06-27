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
    AI_PROVIDER: z.enum(['mock', 'openai', 'ollama']).default('mock'),

    // OpenAI (used when AI_PROVIDER=openai)
    OPENAI_API_KEY: z.string().optional(),
    OPENAI_MODEL: z.string().default('gpt-4o-mini'),

    // Ollama (used when AI_PROVIDER=ollama)
    OLLAMA_BASE_URL: z.string().url().default('http://localhost:11434'),
    OLLAMA_MODEL: z.string().default('llama3.2'),
  })
  .superRefine((value, ctx) => {
    // Conditional rule: OpenAI needs a key, but only when it's the chosen provider.
    if (value.AI_PROVIDER === 'openai' && !value.OPENAI_API_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['OPENAI_API_KEY'],
        message: 'OPENAI_API_KEY is required when AI_PROVIDER=openai',
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
