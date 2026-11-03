import type { RemediationScenario } from './types';

export const RUNTIME_SCENARIOS: RemediationScenario[] = [
  {
    id: 'null-access',
    samples: {
      node: {
        before: `const city = user.address.city.toUpperCase(); // TypeError when address or city is missing`,
        after: `export function cityOf(user: User | undefined): string {
  return user?.address?.city?.toUpperCase() ?? 'UNKNOWN';
}`,
      },
      python: {
        before: `city = user["address"]["city"].upper()  # KeyError or AttributeError when a part is missing`,
        after: `def city_of(user):
    address = (user or {}).get("address") or {}
    return (address.get("city") or "unknown").upper()`,
      },
      java: {
        before: `String city = user.getAddress().getCity().toUpperCase(); // NullPointerException`,
        after: `public static String cityOf(User user) {
    return Optional.ofNullable(user)
        .map(User::getAddress)
        .map(Address::getCity)
        .map(String::toUpperCase)
        .orElse("UNKNOWN");
}`,
      },
      go: {
        before: `city := strings.ToUpper(user.Address.City) // nil pointer dereference when Address is nil`,
        after: `city := "UNKNOWN"
if user != nil && user.Address != nil && user.Address.City != "" {
	city = strings.ToUpper(user.Address.City)
}`,
      },
      ruby: {
        before: `city = user.address.city.upcase # NoMethodError on nil`,
        after: `city = user&.address&.city&.upcase || 'UNKNOWN'`,
      },
      csharp: {
        before: `var city = user.Address.City.ToUpper(); // NullReferenceException`,
        after: `var city = user?.Address?.City?.ToUpper() ?? "UNKNOWN";`,
      },
      php: {
        before: `$city = strtoupper($user['address']['city']); // warning, then a TypeError on null`,
        after: `$city = strtoupper($user['address']['city'] ?? 'unknown');`,
      },
    },
  },
  {
    id: 'unhandled-rejection',
    samples: {
      node: {
        before: `app.get('/orders', async (request, response) => {
  const orders = await loadOrders(); // a rejection here is never caught
  response.json(orders);
});`,
        after: `import type { NextFunction, Request, RequestHandler, Response } from 'express';

export const asyncHandler =
  (handler: (request: Request, response: Response) => Promise<unknown>): RequestHandler =>
  (request: Request, response: Response, next: NextFunction) => {
    handler(request, response).catch(next); // a rejection reaches the error middleware
  };

app.get('/orders', asyncHandler(async (request, response) => response.json(await loadOrders())));

process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'unhandled rejection');
  process.exitCode = 1; // let the supervisor restart a clean process
});`,
      },
      python: {
        before: `async def main():
    asyncio.create_task(sync_orders())  # an exception in this task is silently lost`,
        after: `async def run_safely(coroutine, logger):
    try:
        return await coroutine
    except Exception:
        logger.exception("background task failed")  # visible instead of silently lost


async def main():
    asyncio.create_task(run_safely(sync_orders(), logger))`,
      },
      java: {
        before: `new Thread(() -> processOrders()).start(); // an exception kills the thread silently`,
        after: `static Thread startWorker(Runnable task, Consumer<Throwable> onFailure) {
    Thread worker = new Thread(task);
    worker.setUncaughtExceptionHandler((thread, error) -> onFailure.accept(error));
    worker.start();
    return worker;
}`,
      },
      go: {
        before: `go func() {
	processOrders() // a panic here crashes the whole process
}()`,
        after: `go func() {
	defer func() {
		if recovered := recover(); recovered != nil {
			log.Printf("worker panic: %v", recovered)
		}
	}()
	processOrders()
}()`,
      },
      rust: {
        before: `let config = read_config(&path).unwrap(); // panics on any error`,
        after: `let config = read_config(&path).map_err(|error| format!("cannot read config: {error}"))?;`,
      },
    },
  },
  {
    id: 'out-of-memory',
    samples: {
      node: {
        before: `const content = await readFile(path, 'utf8'); // the whole file lands in memory
for (const line of content.split('\\n')) handle(line);`,
        after: `import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';

export async function processFile(path: string, handle: (line: string) => void): Promise<number> {
  const lines = createInterface({ input: createReadStream(path), crlfDelay: Infinity });
  let count = 0;
  for await (const line of lines) {
    handle(line); // one line at a time, memory stays flat
    count++;
  }
  return count;
}

// Also cap request bodies, for example express.json({ limit: '1mb' }).`,
      },
      python: {
        before: `with open(path) as source:
    lines = source.readlines()  # the whole file in memory
for line in lines:
    handle(line)`,
        after: `def process_file(path, handle):
    count = 0
    with open(path) as source:
        for line in source:  # streams one line at a time
            handle(line)
            count += 1
    return count`,
      },
      java: {
        before: `List<String> lines = Files.readAllLines(path); // the whole file in memory
lines.forEach(this::handle);`,
        after: `public static long process(Path path, Consumer<String> handle) throws IOException {
    long[] count = {0};
    try (Stream<String> lines = Files.lines(path)) { // streamed, one line at a time
        lines.forEach(line -> {
            handle.accept(line);
            count[0]++;
        });
    }
    return count[0];
}`,
      },
      go: {
        before: `data, err := os.ReadFile(path) // the whole file in memory
for _, line := range strings.Split(string(data), "\\n") {
	handle(line)
}`,
        after: `file, err := os.Open(path)
if err != nil {
	return err
}
defer file.Close()

scanner := bufio.NewScanner(file)
for scanner.Scan() {
	handle(scanner.Text()) // one line at a time
}
return scanner.Err()`,
      },
    },
  },
  {
    id: 'missing-environment-variable',
    samples: {
      node: {
        before: `const databaseUrl = process.env.DATABASE_URL; // undefined, the failure shows up far from the cause
const pool = new Pool({ connectionString: databaseUrl });`,
        after: `const REQUIRED = ['DATABASE_URL', 'SESSION_SECRET'] as const;

export function loadConfig(env: Record<string, string | undefined>) {
  const missing = REQUIRED.filter((name) => !env[name]);
  if (missing.length > 0) {
    throw new Error('Missing environment variables: ' + missing.join(', '));
  }
  return {
    databaseUrl: env.DATABASE_URL as string,
    sessionSecret: env.SESSION_SECRET as string,
    port: Number(env.PORT ?? 3000),
  };
}

// At startup: const config = loadConfig(process.env);`,
      },
      python: {
        before: `database_url = os.getenv("DATABASE_URL")  # None, the failure shows up far from the cause`,
        after: `REQUIRED = ("DATABASE_URL", "SESSION_SECRET")


def load_config(env):
    missing = [name for name in REQUIRED if not env.get(name)]
    if missing:
        raise RuntimeError("Missing environment variables: " + ", ".join(missing))
    return {
        "database_url": env["DATABASE_URL"],
        "session_secret": env["SESSION_SECRET"],
        "port": int(env.get("PORT", 3000)),
    }


# At startup: config = load_config(os.environ)`,
      },
      java: {
        before: `String databaseUrl = System.getenv("DATABASE_URL"); // null, the failure shows up far from the cause`,
        after: `public record AppConfig(String databaseUrl, String sessionSecret) {
    public static AppConfig load(Map<String, String> env) {
        List<String> missing = Stream.of("DATABASE_URL", "SESSION_SECRET")
            .filter(name -> env.getOrDefault(name, "").isBlank())
            .toList();
        if (!missing.isEmpty()) {
            throw new IllegalStateException("Missing environment variables: " + String.join(", ", missing));
        }
        return new AppConfig(env.get("DATABASE_URL"), env.get("SESSION_SECRET"));
    }
}`,
      },
      go: {
        before: `databaseURL := os.Getenv("DATABASE_URL") // empty string, the failure shows up far from the cause`,
        after: `func requireEnv(name string) string {
	value := os.Getenv(name)
	if value == "" {
		log.Fatalf("missing environment variable %s", name)
	}
	return value
}

databaseURL := requireEnv("DATABASE_URL")`,
      },
      php: {
        before: `$appKey = getenv('APP_KEY'); // false, the failure shows up far from the cause`,
        after: `$appKey = getenv('APP_KEY');
if ($appKey === false || $appKey === '') {
    throw new RuntimeException('Missing environment variable: APP_KEY');
}`,
      },
    },
  },
  {
    id: 'json-parse-error',
    samples: {
      node: {
        before: `const payload = JSON.parse(request.body); // a SyntaxError turns bad input into a 500`,
        after: `export type ParsedBody = { ok: true; value: unknown } | { ok: false; error: string };

export function parseJsonBody(text: unknown): ParsedBody {
  if (typeof text !== 'string' || text.trim() === '') return { ok: false, error: 'Empty body' };
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false, error: 'Body is not valid JSON' };
  }
}

// if (!parsed.ok) return response.status(400).json({ error: parsed.error });`,
      },
      python: {
        before: `payload = json.loads(request.data)  # JSONDecodeError turns bad input into a 500`,
        after: `def parse_json_body(text):
    if not text or not text.strip():
        return None, "Empty body"
    try:
        return json.loads(text), None
    except json.JSONDecodeError:
        return None, "Body is not valid JSON"`,
      },
      java: {
        before: `JsonNode payload = mapper.readTree(body); // JsonProcessingException turns bad input into a 500`,
        after: `public static Optional<JsonNode> parse(ObjectMapper mapper, String text) {
    if (text == null || text.isBlank()) return Optional.empty();
    try {
        return Optional.of(mapper.readTree(text));
    } catch (JsonProcessingException error) {
        return Optional.empty(); // the caller answers 400, not 500
    }
}`,
      },
      go: {
        before: `var payload Order
json.Unmarshal(body, &payload) // the error is ignored: a half-empty order goes on`,
        after: `var payload Order
if err := json.Unmarshal(body, &payload); err != nil {
	http.Error(w, "Body is not valid JSON", http.StatusBadRequest)
	return
}`,
      },
      php: {
        before: `$payload = json_decode($body, true); // null on error and nobody checks`,
        after: `try {
    $payload = json_decode($body, true, 512, JSON_THROW_ON_ERROR);
} catch (JsonException $error) {
    http_response_code(400);
    exit('Body is not valid JSON');
}`,
      },
    },
  },
  {
    id: 'file-descriptor-leak',
    samples: {
      node: {
        before: `const handle = await open(path, 'r');
const content = await handle.readFile('utf8');
return content.split('\\n')[0]; // handle.close() is never called: descriptors pile up`,
        after: `import { open } from 'node:fs/promises';

export async function readFirstLine(path: string, openFile = open): Promise<string> {
  const handle = await openFile(path, 'r');
  try {
    const content = await handle.readFile('utf8');
    return content.split('\\n')[0];
  } finally {
    await handle.close(); // always release the descriptor
  }
}`,
      },
      python: {
        before: `source = open(path)
return source.readline()  # never closed: descriptors pile up`,
        after: `def read_first_line(path, opener=open):
    with opener(path) as source:  # closed even if reading fails
        return source.readline()`,
      },
      java: {
        before: `BufferedReader reader = new BufferedReader(new FileReader(path));
return reader.readLine(); // never closed: descriptors pile up`,
        after: `public static String readFirstLine(InputStream stream) throws IOException {
    try (BufferedReader reader = new BufferedReader(new InputStreamReader(stream))) {
        return reader.readLine(); // closed automatically
    }
}`,
      },
      go: {
        before: `file, err := os.Open(path)
if err != nil {
	return "", err
}
return readFirstLine(file) // the file is never closed`,
        after: `file, err := os.Open(path)
if err != nil {
	return "", err
}
defer file.Close() // runs on every return path
return readFirstLine(file)`,
      },
      csharp: {
        before: `var reader = new StreamReader(path);
return reader.ReadLine(); // never disposed`,
        after: `using var reader = new StreamReader(path); // disposed at the end of the scope
return reader.ReadLine();`,
      },
      ruby: {
        before: `file = File.open(path)
file.readline # never closed`,
        after: `File.open(path) { |file| file.readline } # the block closes the file`,
      },
    },
  },
];
