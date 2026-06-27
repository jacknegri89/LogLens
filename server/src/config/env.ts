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
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
