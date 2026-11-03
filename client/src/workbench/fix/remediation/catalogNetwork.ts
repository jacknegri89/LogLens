import type { RemediationScenario } from './types';

export const NETWORK_SCENARIOS: RemediationScenario[] = [
  {
    id: 'outbound-timeout',
    samples: {
      node: {
        before: `const response = await fetch(url); // waits as long as the server wants`,
        after: `interface FetchOptions {
  attempts?: number;
  timeoutMs?: number;
  fetcher?: typeof fetch;
}

export async function fetchWithTimeout(
  url: string,
  { attempts = 3, timeoutMs = 5_000, fetcher = fetch }: FetchOptions = {},
): Promise<Response> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fetcher(url, { signal: AbortSignal.timeout(timeoutMs) });
    } catch (error) {
      if (attempt >= attempts) throw error;
    }
  }
}`,
      },
      python: {
        before: `response = requests.get(url)  # no timeout: waits as long as the server wants`,
        after: `import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry


def build_session():
    session = requests.Session()
    session.mount("https://", HTTPAdapter(max_retries=Retry(total=3, backoff_factor=0.5)))
    return session


def fetch(url, session=None):
    return (session or build_session()).get(url, timeout=(3, 10))  # connect, read`,
      },
      java: {
        before: `HttpClient client = HttpClient.newHttpClient();
HttpResponse<String> response = client.send(request, BodyHandlers.ofString()); // no timeout`,
        after: `public final class HttpRequests {
    public static HttpClient client() {
        return HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(3)).build();
    }

    public static HttpRequest build(URI uri) {
        return HttpRequest.newBuilder(uri).timeout(Duration.ofSeconds(10)).build();
    }
}`,
      },
      go: {
        before: `response, err := http.Get(url) // the default client has no timeout`,
        after: `client := &http.Client{Timeout: 10 * time.Second}
response, err := client.Get(url)`,
      },
      csharp: {
        before: `var response = await new HttpClient().GetAsync(url); // 100 seconds by default, and a new client per call`,
        after: `private static readonly HttpClient Client = new() { Timeout = TimeSpan.FromSeconds(10) };

var response = await Client.GetAsync(url);`,
      },
    },
  },
  {
    id: 'rate-limit-429',
    samples: {
      node: {
        before: `const response = await fetch(url);
if (!response.ok) throw new Error('Request failed: ' + response.status); // a 429 is never retried`,
        after: `import { setTimeout as sleep } from 'node:timers/promises';

export async function fetchWithBackoff(
  url: string,
  { attempts = 5, fetcher = fetch, wait = sleep } = {},
): Promise<Response> {
  for (let attempt = 0; attempt < attempts; attempt++) {
    const response = await fetcher(url);
    if (response.status !== 429) return response;
    const retryAfterMs = Number(response.headers.get('retry-after')) * 1000;
    const backoffMs = Math.min(1_000 * 2 ** attempt, 30_000) + Math.random() * 250; // jitter
    await wait(retryAfterMs > 0 ? retryAfterMs : backoffMs);
  }
  throw new Error('Still rate limited after ' + attempts + ' attempts');
}`,
      },
      python: {
        before: `response = requests.get(url)
response.raise_for_status()  # a 429 crashes the whole job`,
        after: `def retry_after_seconds(value):
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0


def get_with_backoff(url, get=requests.get, wait=time.sleep, attempts=5):
    for attempt in range(attempts):
        response = get(url, timeout=10)
        if response.status_code != 429:
            return response
        delay = retry_after_seconds(response.headers.get("Retry-After"))
        wait(delay or min(2**attempt, 30) + random.random())  # jitter
    raise RuntimeError("still rate limited")`,
      },
      java: {
        before: `HttpResponse<String> response = client.send(request, BodyHandlers.ofString());
if (response.statusCode() != 200) throw new IOException("HTTP " + response.statusCode());`,
        after: `static long delayMillis(int attempt, long retryAfterSeconds) {
    if (retryAfterSeconds > 0) return retryAfterSeconds * 1000;
    return Math.min(1000L << attempt, 30_000L) + ThreadLocalRandom.current().nextLong(250); // jitter
}

HttpResponse<String> send(HttpRequest request) throws Exception {
    for (int attempt = 0; attempt < 5; attempt++) {
        HttpResponse<String> response = client.send(request, BodyHandlers.ofString());
        if (response.statusCode() != 429) return response;
        long retryAfter = response.headers().firstValue("Retry-After")
            .filter(value -> value.matches("\\d+")).map(Long::parseLong).orElse(0L);
        Thread.sleep(delayMillis(attempt, retryAfter));
    }
    throw new IOException("Still rate limited");
}`,
      },
      go: {
        before: `resp, err := http.Get(url)
if err != nil || resp.StatusCode != 200 {
	return fmt.Errorf("request failed")
}`,
        after: `for attempt := 0; attempt < 5; attempt++ {
	resp, err := http.Get(url)
	if err != nil {
		return err
	}
	if resp.StatusCode != http.StatusTooManyRequests {
		return handle(resp)
	}
	wait := time.Duration(1<<attempt) * time.Second
	if seconds, err := strconv.Atoi(resp.Header.Get("Retry-After")); err == nil {
		wait = time.Duration(seconds) * time.Second
	}
	resp.Body.Close()
	time.Sleep(wait + time.Duration(rand.Intn(250))*time.Millisecond) // jitter
}
return errors.New("still rate limited")`,
      },
    },
  },
  {
    id: 'expired-certificate',
    samples: {
      node: {
        before: `const server = https.createServer({ key, cert }, app); // read once, never renewed
server.listen(443);`,
        after: `import { X509Certificate } from 'node:crypto';
import { readFileSync, watchFile } from 'node:fs';

export function daysUntil(validTo: string, now = new Date()): number {
  return Math.floor((new Date(validTo).getTime() - now.getTime()) / 86_400_000);
}

const readCredentials = () => ({ key: readFileSync(keyPath), cert: readFileSync(certPath) });
const server = https.createServer(readCredentials(), app);

watchFile(certPath, () => server.setSecureContext(readCredentials())); // pick up the renewed file

const daysLeft = daysUntil(new X509Certificate(readFileSync(certPath)).validTo);
if (daysLeft < 14) logger.warn('Certificate expires in ' + daysLeft + ' days');`,
      },
      python: {
        before: `context = ssl.create_default_context()
context.load_cert_chain(CERT_FILE, KEY_FILE)  # loaded once, never reloaded`,
        after: `from datetime import datetime, timezone


def days_until(not_after, now=None):
    now = now or datetime.now(timezone.utc)
    return (not_after - now).days


def reload_certificate(context):
    context.load_cert_chain(CERT_FILE, KEY_FILE)  # call after every renewal (SIGHUP or a timer)


# not_after comes from cryptography: x509.load_pem_x509_certificate(data).not_valid_after_utc`,
      },
      java: {
        before: `SSLContext context = SSLContext.getInstance("TLS");
context.init(keyManagers, trustManagers, null); // the keystore is read once at startup`,
        after: `public final class CertificateCheck {
    public static long daysLeft(Instant notAfter, Instant now) {
        return Duration.between(now, notAfter).toDays();
    }

    public static void warnIfExpiring(X509Certificate certificate, Logger logger) {
        long days = daysLeft(certificate.getNotAfter().toInstant(), Instant.now());
        if (days < 14) logger.warn("Certificate expires in {} days", days);
    }
}
// Reload the keystore after each renewal instead of only at startup.`,
      },
      go: {
        before: `cert, err := tls.LoadX509KeyPair(certFile, keyFile) // loaded once at startup`,
        after: `config := &tls.Config{
	GetCertificate: func(*tls.ClientHelloInfo) (*tls.Certificate, error) {
		cert, err := tls.LoadX509KeyPair(certFile, keyFile) // picks up renewed files
		if err != nil {
			return nil, err
		}
		leaf, err := x509.ParseCertificate(cert.Certificate[0])
		if err == nil && time.Until(leaf.NotAfter) < 14*24*time.Hour {
			log.Printf("certificate expires on %s", leaf.NotAfter)
		}
		return &cert, nil
	},
}`,
      },
    },
  },
  {
    id: 'cors-blocked',
    samples: {
      node: {
        before: `app.use((request, response, next) => {
  response.header('Access-Control-Allow-Origin', '*'); // too open, and rejected together with cookies
  next();
});`,
        after: `const ALLOWED_ORIGINS = new Set(['https://app.example.com', 'https://admin.example.com']);

export function resolveAllowedOrigin(origin: string | undefined): string | null {
  return origin && ALLOWED_ORIGINS.has(origin) ? origin : null;
}

app.use((request, response, next) => {
  const origin = resolveAllowedOrigin(request.headers.origin);
  if (origin) {
    response.header('Access-Control-Allow-Origin', origin);
    response.header('Vary', 'Origin');
    response.header('Access-Control-Allow-Credentials', 'true');
  }
  if (request.method === 'OPTIONS') return response.sendStatus(204); // preflight
  next();
});`,
      },
      python: {
        before: `CORS(app, origins="*", supports_credentials=True)  # too open, and rejected together with cookies`,
        after: `ALLOWED_ORIGINS = {"https://app.example.com", "https://admin.example.com"}


def resolve_allowed_origin(origin, allowed=ALLOWED_ORIGINS):
    return origin if origin in allowed else None


CORS(app, origins=sorted(ALLOWED_ORIGINS), supports_credentials=True)`,
      },
      java: {
        before: `registry.addMapping("/**").allowedOrigins("*").allowCredentials(true); // Spring refuses this pair`,
        after: `public final class CorsPolicy {
    public static final Set<String> ALLOWED =
        Set.of("https://app.example.com", "https://admin.example.com");

    public static Optional<String> resolveAllowedOrigin(String origin) {
        return Optional.ofNullable(origin).filter(ALLOWED::contains);
    }
}

// registry.addMapping("/**").allowedOrigins(CorsPolicy.ALLOWED.toArray(String[]::new)).allowCredentials(true);`,
      },
      go: {
        before: `w.Header().Set("Access-Control-Allow-Origin", "*")`,
        after: `var allowedOrigins = map[string]bool{
	"https://app.example.com":   true,
	"https://admin.example.com": true,
}

func allowOrigin(w http.ResponseWriter, r *http.Request) {
	origin := r.Header.Get("Origin")
	if allowedOrigins[origin] {
		w.Header().Set("Access-Control-Allow-Origin", origin)
		w.Header().Add("Vary", "Origin")
	}
}`,
      },
    },
  },
];
