import 'dotenv/config';
import { defineConfig } from 'prisma/config';

// Prisma CLI settings (db push, migrations, seed). The CLI uses the direct connection,
// not the pooled one: migrations need a session that the pooler would not keep.
// `prisma generate` does not connect to the database, but this file must still load without
// DIRECT_URL (CI generates the client before it has any database), so a placeholder is used then.
const NO_DATABASE_PLACEHOLDER = 'postgresql://user:password@localhost:5432/loglens';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: process.env.DIRECT_URL ?? NO_DATABASE_PLACEHOLDER,
  },
});
