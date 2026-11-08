import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

/**
 * Runs every scenario and prints the metrics. Repeatable and free: no model is called.
 *   npm run benchmark
 * The results are written to benchmarks/results/latest.json so two runs can be compared.
 */

function percent(value: number | null): string {
  if (value === null) {
    return '  n/a';
  }
  return `${Math.round(value * 100)}%`.padStart(5);
}

async function main(): Promise<void> {
  // The benchmark never touches a database; the server's settings only need a value to load.
  process.env.DATABASE_URL ??= 'postgresql://benchmark:benchmark@localhost:5432/benchmark';
  const { runBenchmarks } = await import('./evaluate');
  const { SCENARIOS } = await import('./scenarios');
  const report = await runBenchmarks(SCENARIOS);
  console.log(
    'scenario                              parse  cover  prec   recall  root   fp     found/exp  ms',
  );
  for (const result of report.scenarios) {
    console.log(
      `${result.id.padEnd(36)} ${percent(result.parsingAccuracy)} ${percent(result.eventCoverage)} ${percent(result.incidentPrecision)} ${percent(result.incidentRecall)}  ${percent(result.rootCauseAccuracy)} ${percent(result.falsePositiveRate)}  ${String(result.foundIncidents).padStart(3)}/${result.expectedIncidents}      ${result.processingMs}`,
    );
    for (const failure of result.failures) {
      console.log(`    ! ${failure}`);
    }
  }
  console.log('\nnew engine  ', JSON.stringify(report.aggregate));
  console.log('legacy      ', JSON.stringify(report.legacyAggregate));
  const directory = path.join(process.cwd(), 'benchmarks', 'results');
  mkdirSync(directory, { recursive: true });
  writeFileSync(path.join(directory, 'latest.json'), `${JSON.stringify(report, null, 2)}\n`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
