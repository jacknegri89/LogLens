import { PrismaClient } from '@prisma/client';

import { env } from '../config/env';

/**
 * A single shared PrismaClient for the whole app.
 *
 * Why a singleton? In development, `tsx watch` reloads our code on every save.
 * If we did `new PrismaClient()` at module level each time, we'd pile up
 * database connections until the pool is exhausted. Caching the instance on
 * `globalThis` guarantees exactly one client survives across reloads.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['warn', 'error'],
  });

if (env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
