/**
 * The honest test of coverage: a real model INVENTS realistic log snippets from many different
 * systems (ones nobody on this project wrote or tuned the engine for), says which lines are
 * failures, and the engine has to find them. It COSTS MONEY (a few cents) and needs your own key in
 * server/.env, so it never runs in tests or in CI:
 *   npm run benchmark:generate -- --yes
 * The model's labels are not perfect, so read every disagreement before believing it.
 */

const CALLS = 8;
const SAMPLES_PER_CALL = 6;
const MAX_ANSWER_TOKENS = 6000;

const THEMES = [
  'web servers, proxies and load balancers (Envoy, Traefik, Caddy, Varnish, IIS, Tomcat)',
  'databases and caches (Oracle, SQL Server, Cassandra, CouchDB, Memcached, ClickHouse)',
  'message queues and streaming (RabbitMQ, ActiveMQ, NATS, Pulsar, SQS consumers)',
  'cloud and containers (AWS Lambda, CloudWatch, GCP, Azure, Docker daemon, Kubernetes events, Nomad)',
  'operating systems and security tools (kernel, sudo, cron, fail2ban, UFW, auditd, macOS, Windows services, OpenVPN, Postfix, BIND)',
  'languages and apps (Elixir, Erlang, Swift, Kotlin, .NET, Django, Celery, Sidekiq, Unity game server, ML training jobs, payment services, CI runners like Jenkins)',
];

const PROMPT = `Invent ${SAMPLES_PER_CALL} short realistic log snippets, each from a DIFFERENT system of this theme: {theme}.
Rules:
- 3 to 8 lines each, copied from the style a real tool really writes (its own timestamp style, level words, field layout). Vary the style a lot; some snippets may have no timestamp at all.
- Two of the ${SAMPLES_PER_CALL} snippets must be completely healthy (no failure at all).
- In the others, one to three lines are real failures (errors, crashes, failed requests, resource exhaustion, denied access, a service that cannot start). Other lines are normal activity.
Reply with one JSON object: {"samples":[{"system":"name","lines":["..."],"failureLines":[1-based line numbers, empty when healthy]}]}`;

interface GeneratedSample {
  system: string;
  lines: string[];
  failureLines: number[];
}

async function generate(
  apiKey: string,
  model: string,
  timeoutMs: number,
  theme: string,
): Promise<GeneratedSample[]> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      temperature: 1,
      max_tokens: MAX_ANSWER_TOKENS,
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: PROMPT.replace('{theme}', theme) }],
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) {
    throw new Error(`OpenAI answered ${response.status}`);
  }
  const data = (await response.json()) as { choices?: { message?: { content?: string } }[] };
  const content = data.choices?.[0]?.message?.content ?? '{}';
  const parsed = JSON.parse(content) as { samples?: unknown };
  if (!Array.isArray(parsed.samples)) {
    return [];
  }
  const samples: GeneratedSample[] = [];
  for (const item of parsed.samples as Partial<GeneratedSample>[]) {
    if (
      typeof item.system === 'string' &&
      Array.isArray(item.lines) &&
      Array.isArray(item.failureLines)
    ) {
      samples.push({
        system: item.system,
        lines: item.lines.map((line) => String(line)),
        failureLines: item.failureLines.map((value) => Number(value)),
      });
    }
  }
  return samples;
}

async function main(): Promise<void> {
  if (!process.argv.includes('--yes')) {
    console.log(
      `This calls a paid model ${CALLS} times. Run again with: npm run benchmark:generate -- --yes`,
    );
    return;
  }
  process.env.DATABASE_URL ??= 'postgresql://benchmark:benchmark@localhost:5432/benchmark';
  const { env } = await import('../src/config/env');
  if (!env.OPENAI_API_KEY) {
    console.log('OPENAI_API_KEY is not set in server/.env: nothing was called.');
    return;
  }
  const apiKey = env.OPENAI_API_KEY;
  const { analyzeStructure } = await import('../src/analysis/analyzeStructure');

  const themes = Array.from({ length: CALLS }, (_, index) => THEMES[index % THEMES.length]);
  const batches = await Promise.all(
    themes.map((theme) =>
      generate(apiKey, env.OPENAI_MODEL, env.AI_TIMEOUT_MS, theme).catch(() => []),
    ),
  );
  const samples = batches.flat();

  let failuresTotal = 0;
  let failuresFound = 0;
  let healthyLinesTotal = 0;
  let falseAlarms = 0;
  let samplesWithMiss = 0;
  let healthySamples = 0;
  let healthySamplesQuiet = 0;
  for (const sample of samples) {
    const analysis = analyzeStructure(sample.lines.join('\n'));
    const inIncident = new Set(analysis.incidents.flatMap((incident) => incident.anomalyEventIds));
    const flaggedAt = (line: number): boolean =>
      analysis.log.events.some(
        (event) =>
          event.originalLineStart <= line &&
          line <= event.originalLineEnd &&
          inIncident.has(event.eventId),
      );
    const misses: number[] = [];
    for (const line of sample.failureLines) {
      failuresTotal += 1;
      if (flaggedAt(line)) {
        failuresFound += 1;
      } else {
        misses.push(line);
      }
    }
    const alarms: number[] = [];
    sample.lines.forEach((_, index) => {
      const line = index + 1;
      if (sample.failureLines.includes(line)) {
        return;
      }
      healthyLinesTotal += 1;
      if (flaggedAt(line)) {
        falseAlarms += 1;
        alarms.push(line);
      }
    });
    if (sample.failureLines.length === 0) {
      healthySamples += 1;
      if (alarms.length === 0) {
        healthySamplesQuiet += 1;
      }
    }
    if (misses.length > 0) {
      samplesWithMiss += 1;
    }
    if (misses.length > 0 || alarms.length > 0) {
      console.log(`\n[${sample.system}]`);
      misses.forEach((line) => console.log(`  MISSED  line ${line}: ${sample.lines[line - 1]}`));
      alarms.forEach((line) =>
        console.log(
          `  FLAGGED line ${line} (the AI says it is healthy): ${sample.lines[line - 1]}`,
        ),
      );
    }
  }
  console.log(`\nsnippets invented by the AI: ${samples.length}`);
  console.log(`failure lines found by the engine: ${failuresFound} of ${failuresTotal}`);
  console.log(`snippets with a missed failure: ${samplesWithMiss}`);
  console.log(`healthy lines flagged: ${falseAlarms} of ${healthyLinesTotal}`);
  console.log(`healthy snippets left quiet: ${healthySamplesQuiet} of ${healthySamples}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});

// Makes this file a module, so its helpers do not clash with the other scripts.
export {};
