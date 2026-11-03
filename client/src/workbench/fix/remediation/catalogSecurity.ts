import type { RemediationScenario } from './types';

export const SECURITY_SCENARIOS: RemediationScenario[] = [
  {
    id: 'path-traversal',
    samples: {
      node: {
        before: `const file = path.join(UPLOAD_DIR, request.query.name); // ../../etc/passwd escapes the folder
response.sendFile(file);`,
        after: `import { resolve, sep } from 'node:path';

export function resolveInside(baseDirectory: string, requested: string): string | null {
  if (requested.includes('\\0')) return null;
  const base = resolve(baseDirectory);
  const target = resolve(base, requested);
  return target.startsWith(base + sep) ? target : null; // never outside the base folder
}`,
      },
      python: {
        before: `path = os.path.join(UPLOAD_DIR, request.args["name"])  # ../../etc/passwd escapes the folder
return send_file(path)`,
        after: `from pathlib import Path


def resolve_inside(base, requested):
    if "\\0" in requested:
        return None
    base_path = Path(base).resolve()
    target = (base_path / requested).resolve()
    return target if base_path in target.parents else None  # never outside the base folder`,
      },
      java: {
        before: `File file = new File(UPLOAD_DIR, request.getParameter("name")); // ../../etc/passwd escapes the folder`,
        after: `public static Path resolveInside(Path base, String requested) {
    Path root = base.toAbsolutePath().normalize();
    Path target = root.resolve(requested).normalize();
    if (!target.startsWith(root)) {
        throw new IllegalArgumentException("Path escapes the base folder");
    }
    return target;
}`,
      },
      php: {
        before: `readfile('/var/www/uploads/' . $_GET['name']); // ../../etc/passwd escapes the folder`,
        after: `$base = realpath('/var/www/uploads');
$target = realpath($base . '/' . ($_GET['name'] ?? ''));
if ($target === false || !str_starts_with($target, $base . DIRECTORY_SEPARATOR)) {
    http_response_code(404);
    exit;
}
readfile($target);`,
      },
      go: {
        before: `file, err := os.Open(filepath.Join(uploadDir, name)) // ../../etc/passwd escapes the folder`,
        after: `target := filepath.Join(uploadDir, filepath.Clean("/"+name)) // Clean removes the ".." parts
if !strings.HasPrefix(target, filepath.Clean(uploadDir)+string(os.PathSeparator)) {
	http.NotFound(w, r)
	return
}
file, err := os.Open(target)`,
      },
    },
  },
  {
    id: 'brute-force-login',
    samples: {
      node: {
        before: `app.post('/login', async (request, response) => {
  const user = await verifyPassword(request.body.email, request.body.password); // unlimited guesses
  if (!user) return response.status(401).end();
  response.json(await createSession(user));
});`,
        after: `interface LimiterOptions {
  maxFailures?: number;
  windowMs?: number;
  lockMs?: number;
}

export function createLoginLimiter({
  maxFailures = 5,
  windowMs = 15 * 60_000,
  lockMs = 15 * 60_000,
}: LimiterOptions = {}) {
  const failures = new Map<string, number[]>();
  const lockedUntil = new Map<string, number>();
  return {
    isLocked: (key: string, now = Date.now()) => (lockedUntil.get(key) ?? 0) > now,
    recordFailure(key: string, now = Date.now()) {
      const recent = (failures.get(key) ?? []).filter((time) => now - time < windowMs);
      recent.push(now);
      failures.set(key, recent);
      if (recent.length >= maxFailures) lockedUntil.set(key, now + lockMs);
    },
    reset(key: string) {
      failures.delete(key);
      lockedUntil.delete(key);
    },
  };
}

// Key by account and by IP. Answer 429 while isLocked(), call reset() after a good login.`,
      },
      python: {
        before: `@app.post("/login")
def login():
    user = verify_password(request.form["email"], request.form["password"])  # unlimited guesses
    return create_session(user) if user else ("", 401)`,
        after: `class LoginLimiter:
    def __init__(self, max_failures=5, window=900, lock=900):
        self.max_failures, self.window, self.lock = max_failures, window, lock
        self.failures, self.locked_until = {}, {}

    def is_locked(self, key, now):
        return self.locked_until.get(key, 0) > now

    def record_failure(self, key, now):
        recent = [time for time in self.failures.get(key, []) if now - time < self.window]
        recent.append(now)
        self.failures[key] = recent
        if len(recent) >= self.max_failures:
            self.locked_until[key] = now + self.lock

    def reset(self, key):
        self.failures.pop(key, None)
        self.locked_until.pop(key, None)`,
      },
      java: {
        before: `@PostMapping("/login")
public ResponseEntity<?> login(@RequestBody Credentials credentials) {
    return users.verify(credentials) ? ok(session(credentials)) : status(401).build(); // unlimited guesses
}`,
        after: `public final class LoginLimiter {
    private final int maxFailures;
    private final Duration window;
    private final Duration lock;
    private final Map<String, Deque<Instant>> failures = new HashMap<>();
    private final Map<String, Instant> lockedUntil = new HashMap<>();

    public LoginLimiter(int maxFailures, Duration window, Duration lock) {
        this.maxFailures = maxFailures;
        this.window = window;
        this.lock = lock;
    }

    public boolean isLocked(String key, Instant now) {
        return lockedUntil.getOrDefault(key, Instant.MIN).isAfter(now);
    }

    public void recordFailure(String key, Instant now) {
        Deque<Instant> recent = failures.computeIfAbsent(key, ignored -> new ArrayDeque<>());
        recent.removeIf(time -> time.plus(window).isBefore(now));
        recent.add(now);
        if (recent.size() >= maxFailures) lockedUntil.put(key, now.plus(lock));
    }
}`,
      },
    },
  },
];
