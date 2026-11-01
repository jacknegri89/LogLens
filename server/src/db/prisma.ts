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

let logLevel: ('query' | 'warn' | 'error')[];
if (env.NODE_ENV === 'development') {
  logLevel = ['query', 'warn', 'error'];
} else {
  logLevel = ['warn', 'error'];
}

/**
 * Pooled connection strings (Neon, Supabase) go through PgBouncer, which needs
 * `pgbouncer=true` so Prisma does not reuse prepared statements.
 */
function withPgbouncer(url: string): string {
  if (!url.includes('-pooler') || url.includes('pgbouncer=')) {
    return url;
  }
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}pgbouncer=true`;
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ log: logLevel, datasourceUrl: withPgbouncer(env.DATABASE_URL) });

if (env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
