/**
 * A real model on the complex scenario. It COSTS MONEY (a few cents) and needs your own key, so it
 * never runs in tests or in CI. Run it yourself, with the key in server/.env:
 *   npm run benchmark:live -- --yes
 * It prints whether the model answered, what the Evidence Validator corrected, and the incidents.
 */
async function main(): Promise<void> {
  const userAgreed = process.env.CONFIRM_LIVE === 'yes' || process.argv.includes('--yes');
  if (!userAgreed) {
    console.log(
      'This calls a paid model. Run again with --yes to go on: npm run benchmark:live -- --yes',
    );
    return;
  }
  // The run never touches a database; the settings only need a value to load.
  process.env.DATABASE_URL ??= 'postgresql://benchmark:benchmark@localhost:5432/benchmark';
  const { env } = await import('../src/config/env');
  if (!env.OPENAI_API_KEY) {
    console.log('OPENAI_API_KEY is not set in server/.env: nothing was called.');
    return;
  }
  const { HybridProvider } = await import('../src/ai/providers/hybridProvider');
  const { OpenAIProvider } = await import('../src/ai/providers/openaiProvider');
  const { RulesProvider } = await import('../src/ai/providers/rulesProvider');
  const { analyzeLogWith } = await import('../src/services/analysisService');
  const { ttlRegression } = await import('./fixtures/ttlRegression');

  const provider = new HybridProvider(new RulesProvider(), new OpenAIProvider());
  const started = performance.now();
  const { report } = await analyzeLogWith(provider, ttlRegression.log);
  const seconds = Math.round((performance.now() - started) / 100) / 10;

  console.log(`took ${seconds}s, model ${env.OPENAI_MODEL}`);
  console.log('engine', JSON.stringify(report.engine));
  console.log(
    `incidents assessed by the model: ${report.engine?.assessedIncidents ?? 0} of ${report.incidents?.length ?? 0}`,
  );
  console.log('validator issues', JSON.stringify(report.validation?.issues ?? [], null, 2));
  for (const incident of report.incidents ?? []) {
    console.log(`\n${incident.id} [${incident.severity}] ${incident.title}`);
    console.log(`  ${incident.rootCause.status}: ${incident.rootCause.summary}`);
  }
  const confirmed = report.incidents?.find((incident) => incident.rootCause.kind === 'change');
  const ok = report.engine?.aiUsed === true && confirmed?.rootCause.status === 'confirmed';
  if (ok) {
    console.log('\nOK: the model ran and the regression stayed confirmed.');
    return;
  }
  console.log('\nCHECK the output above.');
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});

// Makes this file a module, so its helpers do not clash with the other scripts.
export {};
