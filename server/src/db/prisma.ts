import { PrismaPg } from '@prisma/adapter-pg';

import { env } from '../config/env';
import { PrismaClient } from '../generated/prisma/client';

/**
 * A single shared PrismaClient for the whole app.
 *
 * Why a singleton? In development, `tsx watch` reloads our code on every save.
 * If we did `new PrismaClient()` at module level each time, we'd pile up
 * database connections until the pool is exhausted. Caching the instance on
 * `globalThis` guarantees exactly one client survives across reloads.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const logLevels: ('query' | 'warn' | 'error')[] =
  env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['warn', 'error'];

/**
 * Prisma 7 talks to the database through a driver adapter. We pass the pooled URL
 * (DATABASE_URL) here: the application's traffic is short queries, which the pooler handles.
 */
function createPrismaClient(): PrismaClient {
  const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });
  return new PrismaClient({ adapter, log: logLevels });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
