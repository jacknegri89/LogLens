import { prisma } from '../src/db/prisma';
import type { AnalysisReport, Severity } from '../src/types/report';

/**
 * Seed = example data for local development.
 *
 * Running this gives the history page something to show before the AI
 * pipeline exists, and it also proves the whole chain works
 * (env -> Prisma client -> SQLite). It is idempotent: it wipes the table
 * first, so re-running always leaves the same known state.
 */

interface SeedItem {
  title: string;
  severity: Severity;
  category: string;
  rawLog: string;
  report: AnalysisReport;
}

const items: SeedItem[] = [
  {
    title: "Unhandled TypeError: reading 'map' of undefined in report builder",
    severity: 'high',
    category: 'Runtime',
    rawLog: [
      '2026-06-20T09:14:23.104Z ERROR Unhandled promise rejection in request handler',
      "TypeError: Cannot read properties of undefined (reading 'map')",
      '    at buildReport (/app/server/src/services/report.ts:42:28)',
      '2026-06-20T09:14:23.107Z ERROR Request failed: POST /api/analyses 500',
    ].join('\n'),
    report: {
      keyLines: [
        "TypeError: Cannot read properties of undefined (reading 'map')",
        'at buildReport (/app/server/src/services/report.ts:42:28)',
      ],
      causes: [
        'A value expected to be an array is undefined when buildReport runs.',
        'The upstream field (e.g. analysis.items) was never set or failed to load.',
      ],
      debugSteps: [
        'Add a default ([]) or a guard before calling .map in report.ts:42.',
        'Log the input to buildReport to confirm which field is undefined.',
        'Check where that field is supposed to be assigned upstream.',
      ],
      bugReportMarkdown:
        '## Unhandled TypeError in report builder\n\n' +
        '**Severity:** High\n**Category:** Runtime\n\n' +
        '### What happens\n`POST /api/analyses` returns 500 because `buildReport` calls ' +
        '`.map` on an undefined value.\n\n' +
        '### Suggested fix\nGuard the value (default to `[]`) and verify the upstream assignment.',
    },
  },
  {
    title: 'Database unreachable: ECONNREFUSED on db:5432',
    severity: 'medium',
    category: 'Database',
    rawLog: [
      "2026-06-20T10:02:14.553Z ERROR PrismaClientInitializationError: Can't reach database server at `db:5432`",
      '2026-06-20T10:02:14.560Z ERROR Failed to connect: ECONNREFUSED 172.18.0.2:5432',
      '2026-06-20T10:05:41.220Z WARN  Retrying connection (attempt 3/5)...',
    ].join('\n'),
    report: {
      keyLines: [
        "PrismaClientInitializationError: Can't reach database server at `db:5432`",
        'Failed to connect: ECONNREFUSED 172.18.0.2:5432',
      ],
      causes: [
        'The database container/service is not running or not yet ready.',
        'Wrong host/port in DATABASE_URL, or the network/depends_on order is off.',
      ],
      debugSteps: [
        'Confirm the database service is up and accepting connections on 5432.',
        'Check DATABASE_URL host matches the service name (e.g. `db`).',
        'Add a healthcheck / wait-for-db before starting the API.',
      ],
      bugReportMarkdown:
        '## Database unreachable (ECONNREFUSED)\n\n' +
        '**Severity:** Medium\n**Category:** Database\n\n' +
        '### What happens\nThe API cannot connect to PostgreSQL at `db:5432` on startup.\n\n' +
        '### Suggested fix\nEnsure the DB is ready before the API starts and verify the host/port.',
    },
  },
];

async function main() {
  await prisma.analysis.deleteMany();

  for (const item of items) {
    await prisma.analysis.create({
      data: {
        source: 'paste',
        rawLog: item.rawLog,
        title: item.title,
        severity: item.severity,
        category: item.category,
        report: JSON.stringify(item.report),
      },
    });
  }

  const count = await prisma.analysis.count();
  console.log(`Seeded database: ${count} analyses.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
