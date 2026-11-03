/**
 * Knowledge base of the rules engine: the failures it recognises and the advice
 * shown to the reader. Everything a visitor reads here lives in this file, so the
 * wording can change without touching the engine in `rulesProvider.ts`.
 *
 * English is the source of truth: the patterns, ids and categories are written once, here.
 * Every other language is a parallel text table (`rules.it.ts`) keyed by the rule id, so a rule
 * without a translation does not compile.
 */
import type { Severity } from '../types/report';
import type { LogDetails } from './logDetails';

/** The stable name of each rule. A translation table has one entry per id. */
export type RuleId =
  | 'injection-attack'
  | 'postgres-password-failed'
  | 'image-pull-or-crash-loop'
  | 'dns-resolution'
  | 'disk-full'
  | 'certificate-verification'
  | 'cors-blocked'
  | 'hydration-mismatch'
  | 'java-null-pointer'
  | 'database-unreachable'
  | 'connection-refused'
  | 'port-in-use'
  | 'out-of-memory'
  | 'null-property-access'
  | 'type-error'
  | 'index-error'
  | 'duplicate-key'
  | 'not-null-violation'
  | 'timeout'
  | 'module-not-found'
  | 'permission-denied'
  | 'file-not-found'
  | 'unauthorized'
  | 'syntax-error'
  | 'stack-overflow'
  | 'connection-pool-exhausted'
  | 'failed-login-attempts'
  | 'bad-gateway'
  | 'server-error'
  | 'rate-limited'
  | 'unhandled-promise-rejection'
  | 'connection-reset'
  | 'python-exception'
  | 'segmentation-fault'
  | 'mysql-access-denied'
  | 'tls-certificate'
  | 'redis-rejected-command'
  | 'docker-daemon'
  | 'native-panic'
  | 'dotnet-exception'
  | 'php-fatal-error'
  | 'ruby-nil-method'
  | 'nginx-error'
  | 'service-failed-to-start'
  | 'pod-evicted'
  | 'sqlite-locked'
  | 'missing-table-or-column'
  | 'too-many-open-files'
  | 'host-unreachable'
  | 'connection-aborted'
  | 'cloud-access-denied'
  | 'invalid-json-body'
  | 'unhandled-exception'
  | 'client-error'
  | 'fallback';

/** What the reader is told about a rule: the only part of a rule that changes with the language. */
export interface RuleText {
  causes: string[];
  /** Builds the causes from the log when its details make the cause specific. Replaces `causes`. */
  causesFor?: (details: LogDetails) => string[];
  debugSteps: string[];
}

/**
 * One known kind of failure: how to recognise it in a log, and what to tell the
 * reader about it (in English; see `rules.it.ts` for the other languages).
 * Rules are checked in order, the first match wins.
 */
export interface Rule extends RuleText {
  id: RuleId;
  pattern: RegExp;
  /** A technical label that stays in English in every language: the correlation table relies on it. */
  category: string;
  severity?: Severity;
  /** Raises the severity to critical when the log also shows a server error (5xx). */
  criticalOnServerError?: boolean;
  /** MITRE ATT&CK technique, set only where the rule describes adversary behaviour. */
  mitre?: string;
  /** OWASP Top 10 (2021) category, set only where the rule maps to one. */
  owasp?: string;
}

/** Scanner names and injection payloads that mark a request as an attack. */
export const ATTACK_SIGNATURE =
  /sqlmap|\bnikto\b|\bnmap\b|dirbuster|gobuster|acunetix|union(?:\s|%20|\+)+select|(?:'|%27)(?:\s|%20|\+)*or(?:\s|%20|\+)+\d+(?:=|%3d)\d+|sleep\(\d+\)|<script|\.\.\/\.\.\/|%2e%2e(?:%2f|\/)|\$\{jndi:|onerror\s*=|;\s*cat\s+\/etc\/passwd/i;

export const FAILURE_LINE =
  /\berror\b|[a-z]Error\b|exception|\bfatal\b|\bpanic\b|\bfail(?:ed|ure|s)?\b|refused|killed|\btimeout\b|timed out|denied|traceback/i;

const FAILING_LINE = 'the failing line of the log';

const CLIENT_ERROR_MEANING: Record<string, string> = {
  '400': 'the request is malformed or has invalid parameters.',
  '404': 'the path does not exist on this server.',
  '405': 'the HTTP method (GET, POST, ...) is not allowed on this path.',
  '408': 'the client was too slow to send the request.',
  '413': 'the request body is larger than the server accepts.',
};

export const RULES: Rule[] = [
  {
    id: 'injection-attack',
    pattern: ATTACK_SIGNATURE,
    category: 'Security Attack',
    severity: 'high',
    criticalOnServerError: true,
    mitre: 'T1190 Exploit Public-Facing Application',
    owasp: 'A03:2021 Injection',
    causes: [
      'An automated attack tool or scanner sent injection payloads (SQL, XSS or path traversal) in the request.',
      'The payload reached the application logic without being rejected or escaped, so the server failed while processing it.',
    ],
    debugSteps: [
      'Block the source IP at the firewall or WAF (for example: iptables -A INPUT -s <IP> -j DROP) and add a WAF rule for this payload.',
      'Replace string concatenation in the query with a prepared statement, for example db.query("SELECT * FROM products WHERE id = $1", [id]).',
      'Check the database and application logs for the same time window to see whether any data was returned.',
      'Return a generic error to the client and log the details on the server, so no SQL error reaches the attacker.',
    ],
  },
  {
    id: 'postgres-password-failed',
    pattern: /password authentication failed for user/i,
    category: 'Database Connection Failure',
    severity: 'high',
    causesFor: ({ postgresUser }) => {
      const user = postgresUser ?? 'the configured user';
      return [
        `Wrong credentials for user ${user} on PostgreSQL: the server rejected the password (FATAL: password authentication failed).`,
        'Because the login fails, the connection pool cannot open any connection and the requests that need the database fail.',
      ];
    },
    causes: [],
    debugSteps: [
      'Compare the user and password in DATABASE_URL (or the JDBC URL) with the real credentials of the database role.',
      'Test the same credentials by hand: psql -h <host> -U <user> -d <database>.',
      "If the password changed, update the secret the app reads, or reset it on the server: ALTER USER <user> WITH PASSWORD '...';",
      'Make sure the app reads the secret from the environment or the secret store, not from an old file or a cached value.',
    ],
  },
  {
    id: 'image-pull-or-crash-loop',
    pattern:
      /imagepullbackoff|errimagepull|crashloopbackoff|back-off restarting|failed to pull image/i,
    category: 'Infrastructure',
    severity: 'high',
    causes: [
      'The container image cannot be downloaded: wrong name or tag, or no access to the registry.',
      'The container starts and crashes right away, so Kubernetes keeps restarting it.',
    ],
    debugSteps: [
      'Run kubectl describe pod and read the Events section at the bottom.',
      'Check the image name and tag, and that the cluster has the credentials for the registry.',
      'For a crash loop, read the logs of the previous run (kubectl logs --previous).',
    ],
  },
  {
    id: 'dns-resolution',
    pattern:
      /\benotfound\b|getaddrinfo|could not resolve host|name or service not known|temporary failure in name resolution/i,
    category: 'Network',
    severity: 'high',
    causes: [
      'The host name cannot be resolved: it is misspelled, or the DNS server does not know it.',
      'The machine or container has no internet access or uses a wrong DNS server.',
    ],
    debugSteps: [
      'Check the host name for typos in the configuration or the URL.',
      'Resolve the name by hand from the same machine (nslookup, ping).',
      'Check the DNS and proxy settings of the machine or container.',
    ],
  },
  {
    id: 'disk-full',
    pattern: /no space left on device|enospc|disk quota exceeded/i,
    category: 'Infrastructure',
    severity: 'high',
    causes: [
      'The disk or the partition where the app writes is full.',
      'Logs, caches or temporary files grew without a limit.',
    ],
    debugSteps: [
      'Check free space (df -h) and find what takes it (du -sh on the biggest folders).',
      'Remove old logs and temporary files, and set up log rotation.',
      'Move the data to a bigger volume if the growth is expected.',
    ],
  },
  {
    id: 'certificate-verification',
    pattern:
      /unable to verify the first certificate|self[- ]signed certificate|certificate has expired|cert_has_expired|ssl routines|unable_to_verify_leaf_signature/i,
    category: 'Network',
    severity: 'medium',
    owasp: 'A02:2021 Cryptographic Failures',
    causes: [
      'The certificate is expired, self-signed, or not issued by an authority the client trusts.',
      'The server does not send the full certificate chain.',
    ],
    debugSteps: [
      'Open the address in a browser and look at the certificate and its expiry date.',
      'Install the full chain on the server, or add your own authority to the client trust store.',
      'Do not turn off certificate checks in production: fix the certificate instead.',
    ],
  },
  {
    id: 'cors-blocked',
    pattern: /blocked by cors policy|no 'access-control-allow-origin'/i,
    category: 'Network',
    severity: 'low',
    causes: [
      'The API does not allow the origin of the page that calls it.',
      'The response to the preflight (OPTIONS) request misses the CORS headers.',
    ],
    debugSteps: [
      'Allow the exact origin of the frontend in the API CORS settings.',
      'In development, proxy the API through the dev server so the browser sees one origin.',
      'Check in the browser network tab that the OPTIONS request returns the allow headers.',
    ],
  },
  {
    id: 'hydration-mismatch',
    pattern: /hydration failed|text content does not match|hydrat/i,
    category: 'Runtime',
    severity: 'low',
    causes: [
      'The HTML rendered on the server differs from what the browser renders first.',
      'The code uses values that change between the two, such as dates, random numbers or window.',
    ],
    debugSteps: [
      'Find the component named in the message and look for dates, random values or browser-only checks.',
      'Move that code into an effect that runs only in the browser.',
    ],
  },
  {
    id: 'java-null-pointer',
    pattern: /nullpointerexception/i,
    category: 'Runtime',
    severity: 'high',
    causes: [
      'A reference is null at the line named in the stack trace.',
      'A method returned null and the result was used without a check.',
    ],
    debugSteps: [
      'Open the first line of the stack trace that belongs to your code.',
      'Find which reference on that line is null and where it should have been set.',
      'Check it before use, or make the method return an empty value instead of null.',
    ],
  },
  {
    id: 'database-unreachable',
    pattern:
      /can't reach database server|(econnrefused|connection refused)[^\n]*(postgres|mysql|mongo|redis|database|:5432|:3306|:27017|:6379)/i,
    category: 'Database',
    severity: 'high',
    causes: [
      'The service you connect to is not running, or is not ready yet when the app starts.',
      'The host or port is wrong. Inside Docker, "localhost" is the container itself, not the other service.',
      'A firewall or network policy blocks the connection.',
    ],
    debugSteps: [
      'Check that the target service is running and listening on the expected port.',
      'Compare the host and port in your configuration (for example DATABASE_URL) with the real ones.',
      'Try to connect by hand from the same machine or container (psql, nc, curl).',
      'In Docker Compose, use the service name as host and wait for a healthy status before starting the app.',
    ],
  },
  {
    id: 'connection-refused',
    pattern: /econnrefused|connection refused/i,
    category: 'Network',
    severity: 'high',
    causes: [
      'Nothing listens on that address and port: the service is down or not ready yet.',
      'The address is wrong. Inside Docker, "localhost" is the container itself, not another service.',
    ],
    debugSteps: [
      'Check that the target service is running and listens on the expected port.',
      'Compare the host and port in your configuration with the real ones.',
      'Try the connection by hand from the same machine or container (curl, nc).',
    ],
  },
  {
    id: 'port-in-use',
    pattern: /eaddrinuse|address already in use/i,
    category: 'Network',
    severity: 'medium',
    causes: [
      'Another process already listens on the same port, often an earlier run that did not stop.',
      'Two services in the same setup are configured with the same port.',
    ],
    debugSteps: [
      'Find the process that holds the port (lsof -i :PORT on macOS and Linux, netstat -ano on Windows).',
      'Stop that process, or start this app on another port.',
      'Check that the port is not defined twice in your configuration or compose file.',
    ],
  },
  {
    id: 'out-of-memory',
    pattern: /out of memory|outofmemoryerror|oomkilled|heap out of memory|exit code 137/i,
    category: 'Infrastructure',
    severity: 'high',
    causes: [
      'The process went over its memory limit and was killed.',
      'A memory leak: objects that are never released keep growing.',
      'A single request loads too much data in memory at once.',
    ],
    debugSteps: [
      'Check the memory limit of the container or the machine and how close the app runs to it.',
      'Take a heap snapshot or watch memory over time to find what grows.',
      'Process large data in chunks or streams instead of loading it all.',
      'Raise the limit only after you know the app needs more (for Node: --max-old-space-size).',
    ],
  },
  {
    id: 'null-property-access',
    pattern:
      /cannot read propert(y|ies) of (undefined|null)|undefined is not an object|is not a function/i,
    category: 'Runtime',
    severity: 'high',
    causes: [
      'A value that should exist is undefined or null at this point.',
      'A function received data in a different shape than expected, often an empty API or database result.',
      'A call happens before the data is loaded.',
    ],
    debugSteps: [
      'Open the first stack frame that belongs to your code and look at the variable on that line.',
      'Log the value just before the failing line to see what it really is.',
      'Check or validate the input before using it, and decide what happens when it is missing.',
    ],
  },
  {
    id: 'type-error',
    pattern: /\bTypeError\b/,
    category: 'Runtime',
    severity: 'high',
    causesFor: ({ typeErrorMessage }) => [
      `A call received a value of the wrong type: ${typeErrorMessage ?? 'a value of the wrong type'}.`,
      'The value comes from input or data whose type the code does not check before using it.',
    ],
    causes: [],
    debugSteps: [
      'Open the file and line named in the message or in the last stack frame.',
      'Print the type of the value passed there (typeof, type() or gettype()) just before the call.',
      'Convert or validate the input where it enters the code, and reject a wrong type with a clear error.',
    ],
  },
  {
    id: 'index-error',
    pattern: /\bIndexError\b|(?:list|string|tuple) index out of range/i,
    category: 'Runtime',
    severity: 'high',
    causesFor: ({ lastFrame }) => [
      `An index is read beyond the end of a sequence at ${lastFrame ?? FAILING_LINE}: the list, string or tuple is shorter than the code expects.`,
      'The data source returned fewer items than expected, often an empty query or API result.',
    ],
    causes: [],
    debugSteps: [
      'Open the file and line named in the last frame of the traceback and look at the index used there.',
      'Print len() of that sequence just before the failing line to see its real size.',
      'Check the length before indexing (for example if items:) or use a default, and decide what the caller gets when the data is empty.',
    ],
  },
  {
    id: 'duplicate-key',
    pattern: /duplicate key|unique constraint|unique violation|sqlite_constraint_unique/i,
    category: 'Database',
    severity: 'medium',
    causes: [
      'The code inserts a row whose unique value already exists.',
      'Two requests insert the same value at the same time (a race condition).',
    ],
    debugSteps: [
      'Look at the constraint name in the message to find the column that must be unique.',
      'Check for an existing row first, or use an upsert (insert or update).',
      'Handle this error explicitly and return a clear message to the user.',
    ],
  },
  {
    id: 'not-null-violation',
    pattern: /violates (?:not-null|not null) constraint|null value in column/i,
    category: 'Database',
    severity: 'high',
    causesFor: ({ nullColumn }) => [
      `The INSERT or UPDATE writes NULL into ${nullColumn ?? 'a required column'}, which the table does not allow.`,
      'The code builds the row without a value for this field, often because the input was missing or an earlier step failed.',
    ],
    causes: [],
    debugSteps: [
      'Find the code that builds the row and check that every NOT NULL column receives a value.',
      'Validate the required fields before the insert, and return a clear error when one is missing.',
      'Compare the table definition (\\d <table> in psql) with the fields the code sends.',
    ],
  },
  {
    id: 'timeout',
    pattern: /etimedout|timed out|timeout(?!_)|deadline exceeded/i,
    category: 'Network',
    severity: 'medium',
    causes: [
      'The remote service is slow or unreachable.',
      'The timeout is shorter than the time the operation really needs.',
      'The network between the two machines drops packets.',
    ],
    debugSteps: [
      'Call the remote service by hand and measure how long it takes.',
      'Check whether the service is overloaded or down.',
      'Add a retry with a growing delay, and set a timeout that matches the real operation.',
    ],
  },
  {
    id: 'module-not-found',
    pattern: /cannot find module|module not found|err_module_not_found|no module named/i,
    category: 'Build',
    severity: 'medium',
    causes: [
      'A dependency is missing: it is not installed or not listed in the package file.',
      'The import path is wrong, or its upper and lower case differs from the real file name.',
    ],
    debugSteps: [
      'Run the install command again (npm install, pip install -r requirements.txt).',
      'Check that the package is in the dependency list, not only installed on your machine.',
      'Check the import path and the exact file name, including case.',
    ],
  },
  {
    id: 'permission-denied',
    pattern: /eacces|permission denied|eperm/i,
    category: 'Permissions',
    severity: 'medium',
    causes: [
      'The user that runs the process cannot read, write or run the file or port.',
      'Ports below 1024 need extra privileges on many systems.',
    ],
    debugSteps: [
      'Look at the owner and permissions of the file or folder in the message.',
      'Run the app as a user that has access, or change the permissions on that path only.',
      'Use a port above 1024 if the error is about a port.',
    ],
  },
  {
    id: 'file-not-found',
    pattern: /enoent|no such file or directory/i,
    category: 'Filesystem',
    severity: 'medium',
    causes: [
      'The file or folder does not exist at that path.',
      'The path is relative and the app runs from a different working directory than expected.',
    ],
    debugSteps: [
      'Print the full path the app tries to open and check it exists.',
      'Use absolute paths, or build them from the location of the current file.',
      'Make sure the file is created or copied in the build or deploy step.',
    ],
  },
  {
    id: 'unauthorized',
    pattern: /unauthorized|forbidden|\b401\b|\b403\b|invalid token|jwt expired/i,
    category: 'Authentication',
    severity: 'medium',
    causes: [
      'The credentials or the token are missing, wrong or expired.',
      'The account has no permission for this operation.',
    ],
    debugSteps: [
      'Check that the request really sends the token or key, and in the right header.',
      'Check its expiry date and renew it if needed.',
      'Check the permissions of the account for this resource.',
    ],
  },
  {
    id: 'syntax-error',
    pattern: /syntaxerror|unexpected token|unexpected end of json/i,
    category: 'Runtime',
    severity: 'medium',
    causes: [
      'The text being parsed is not valid, for example an HTML error page read as JSON.',
      'A file has a typo or an unfinished block.',
    ],
    debugSteps: [
      'Print the raw text right before it is parsed.',
      'Check the status and content type of the response that was parsed.',
      'Run a linter or formatter on the file named in the message.',
    ],
  },
  {
    id: 'stack-overflow',
    pattern: /maximum call stack|stack overflow/i,
    category: 'Runtime',
    severity: 'high',
    causes: [
      'A function calls itself, directly or through others, with no stopping condition.',
      'Data with a cycle is processed as if it were a tree.',
    ],
    debugSteps: [
      'Look at the repeated frames in the stack trace: they show the loop.',
      'Add or fix the stopping condition of the recursion.',
      'Turn the recursion into a loop if the depth can be large.',
    ],
  },
  {
    id: 'connection-pool-exhausted',
    pattern:
      /deadlock detected|too many connections|remaining connection slots|pool (?:is )?exhausted|timeout (?:acquiring|waiting for) (?:a )?connection/i,
    category: 'Database',
    severity: 'high',
    causes: [
      'Too many connections are open, or every connection of the pool is busy: each request or function opens its own, or a slow query holds them.',
      'Two transactions wait for each other and neither can continue.',
    ],
    debugSteps: [
      'Reuse one shared connection pool instead of opening connections per request.',
      'On serverless platforms, connect through the pooled connection string.',
      'Keep transactions short and always lock rows in the same order.',
    ],
  },
  {
    id: 'failed-login-attempts',
    pattern: /failed password for|invalid user \S+ from|authentication failure;.*rhost=/i,
    category: 'Security Attack',
    severity: 'high',
    mitre: 'T1110 Brute Force',
    owasp: 'A07:2021 Identification and Authentication Failures',
    causes: [
      'Repeated login attempts with wrong passwords or unknown users: a brute-force or credential-guessing attack.',
    ],
    debugSteps: [
      'List the source addresses of the failed attempts (grep "Failed password" /var/log/auth.log | sort | uniq -c).',
      'Block the addresses that repeat, for example with fail2ban or a firewall rule.',
      'Disable password login for SSH and use keys, and check that no account has an empty password.',
    ],
  },
  {
    id: 'bad-gateway',
    pattern:
      /\bbad gateway\b|service unavailable|gateway timeout|"\s50[234]\s|\bstatus[=:\s]+50[234]\b/i,
    category: 'Infrastructure',
    severity: 'high',
    causes: [
      'The proxy or load balancer could not get a valid answer from the application behind it: the app is down, overloaded or restarting.',
    ],
    debugSteps: [
      'Check that the application process or container is running and healthy.',
      'Read the application log at the same timestamp: the error that caused the 5xx is there.',
      'Check the upstream timeout of the proxy against how long the request really takes.',
    ],
  },
  {
    id: 'server-error',
    pattern: /"\s5\d{2}\s|\bstatus[=:\s]+5\d{2}\b/i,
    category: 'Server Error',
    severity: 'high',
    causes: [
      'The application failed while handling this request and returned a server error.',
      'The request reached code that throws or depends on a service that did not answer.',
    ],
    debugSteps: [
      'Find the application log line for the same request (same time and path) to see the exception.',
      'Reproduce the request with curl and check whether it fails every time or only sometimes.',
      'Fix the failing code path, and return a clear error body instead of an empty 500.',
    ],
  },
  {
    id: 'rate-limited',
    pattern: /"\s429\s|too many requests|rate limit exceeded/i,
    category: 'Rate Limit',
    severity: 'low',
    causes: [
      'A client sent more requests than the rate limit allows, so the server refused the extra ones.',
    ],
    debugSteps: [
      'Find the client (IP address or API key) that sends the requests and check whether it is expected.',
      'Add a backoff with retry to the client, or raise the limit only for trusted clients.',
    ],
  },
  {
    id: 'unhandled-promise-rejection',
    pattern: /unhandledpromiserejection|unhandled promise rejection/i,
    category: 'Runtime',
    severity: 'high',
    causes: [
      'A Promise was rejected and nothing caught the rejection, so Node.js treats it as a crash.',
    ],
    debugSteps: [
      'Open the first stack frame of the rejection and find the async call that has no catch or try/await.',
      'Add a try/catch around that await or a .catch() that logs and handles the error.',
    ],
  },
  {
    id: 'connection-reset',
    pattern: /econnreset|socket hang up|connection reset by peer/i,
    category: 'Network',
    severity: 'medium',
    causes: [
      'The other side closed the connection while a request was still running: often a server restart, a timeout or a proxy cutting idle connections.',
    ],
    debugSteps: [
      'Check whether the remote service restarted or crashed at the same time.',
      'Compare the client timeout and the keep-alive timeout of the server or proxy.',
      'Retry idempotent requests with a short backoff.',
    ],
  },
  {
    id: 'python-exception',
    pattern:
      /\bKeyError\b|\bValueError\b|\bAttributeError\b|\bZeroDivisionError\b|\bRecursionError\b/,
    category: 'Runtime',
    severity: 'high',
    causesFor: ({ lastFrame }) => [
      `The exception is raised at ${lastFrame ?? FAILING_LINE} and was not handled there.`,
      'The value at that line has a key, attribute or number that the code does not expect: often missing data or a wrong type.',
    ],
    causes: [],
    debugSteps: [
      'Open the file and line named in the last frame of the traceback.',
      'Print the value that is used there (the key, the attribute owner or the divisor) just before the failing line.',
      'Validate the input, or use a default, and decide what the caller gets when the data is missing.',
    ],
  },
  {
    id: 'segmentation-fault',
    pattern: /segmentation fault|segfault|sigsegv|core dumped/i,
    category: 'Runtime',
    severity: 'high',
    causes: [
      'The process accessed memory it does not own: a bad pointer, a use-after-free, or a native library used incorrectly.',
    ],
    debugSteps: [
      'Run the program under a debugger (gdb or lldb) or with AddressSanitizer to find the faulting line.',
      'Check the native libraries and their versions, and rebuild them if the ABI changed.',
    ],
  },
  {
    id: 'mysql-access-denied',
    pattern: /access denied for user/i,
    category: 'Database Connection Failure',
    severity: 'high',
    causesFor: ({ mysqlUser }) => {
      const user = mysqlUser ?? 'the configured user';
      return [
        `Wrong credentials for user ${user} on MySQL: the server rejected the login.`,
        'Because the login fails, the application cannot use the database and its requests fail.',
      ];
    },
    causes: [],
    debugSteps: [
      'Compare the user and password in the configuration with the real credentials of the MySQL account.',
      'Test the login by hand: mysql -h <host> -u <user> -p.',
      'Check that the account is allowed to connect from the host the app runs on (the host part of the account name).',
    ],
  },
  {
    id: 'tls-certificate',
    pattern:
      /certificate has expired|self[- ]signed certificate|unable to verify the first certificate|ssl certificate problem|x509: certificate|cert_has_expired/i,
    category: 'Network',
    severity: 'high',
    owasp: 'A02:2021 Cryptographic Failures',
    causes: [
      'The TLS certificate is expired, does not match the host name, or is signed by an authority the client does not trust.',
      'A self-signed or internal certificate is used without the matching CA certificate on the client.',
    ],
    debugSteps: [
      'Check the expiry date and the host names of the certificate: openssl s_client -connect <host>:443 -servername <host>.',
      'Renew the certificate, or install the missing intermediate and CA certificates on the server.',
      'Do not turn off certificate checks in the client; add the correct CA certificate instead.',
    ],
  },
  {
    id: 'redis-rejected-command',
    pattern: /\bNOAUTH\b|\bWRONGPASS\b|OOM command not allowed|MISCONF Redis/,
    category: 'Database Connection Failure',
    severity: 'high',
    causes: [
      'Redis rejects the command: the client is not logged in (NOAUTH), the password is wrong (WRONGPASS), or Redis is out of memory or cannot save to disk (OOM, MISCONF).',
    ],
    debugSteps: [
      'Compare the Redis password in the configuration with the requirepass value of the server.',
      'For OOM, check maxmemory and the eviction policy, and free memory or raise the limit.',
      'For MISCONF, check the disk space and permissions of the Redis data directory.',
    ],
  },
  {
    id: 'docker-daemon',
    pattern:
      /cannot connect to the docker daemon|docker: error response from daemon|docker daemon is not running/i,
    category: 'Infrastructure',
    severity: 'high',
    causes: [
      'The Docker daemon is not running, or the current user has no permission to reach its socket.',
      'The command points to a daemon on another host through DOCKER_HOST.',
    ],
    debugSteps: [
      'Start the daemon (systemctl start docker) or open Docker Desktop, then retry.',
      'Add the user to the docker group, or run the command with sudo, if the socket reports permission denied.',
      'Check the DOCKER_HOST variable and the context selected with docker context ls.',
    ],
  },
  {
    id: 'native-panic',
    pattern: /^panic: |goroutine \d+ \[running\]|thread '[^']*' panicked at/im,
    category: 'Runtime',
    severity: 'high',
    causes: [
      'The program hit a condition it does not handle (nil pointer, index out of range, failed unwrap) and stopped.',
    ],
    debugSteps: [
      'Read the first stack frame that belongs to your code, not to the standard library.',
      'Check the value named in the panic message at that line: nil, length or unwrap result.',
      'Return an error from that path instead of panicking, and handle it where the call is made.',
    ],
  },
  {
    id: 'dotnet-exception',
    pattern: /unhandled exception\.|system\.\w+exception|nullreferenceexception/i,
    category: 'Runtime',
    severity: 'high',
    causes: [
      'A .NET exception was not caught, so the application ended. The top frame shows where it was thrown.',
    ],
    debugSteps: [
      'Open the first frame of your own code in the stack trace.',
      'Check the object or value used there for null or out-of-range data.',
      'Catch the exception at the boundary that can handle it, and log the full details.',
    ],
  },
  {
    id: 'php-fatal-error',
    pattern: /php fatal error|uncaught (?:exception|error)|call to undefined function/i,
    category: 'Runtime',
    severity: 'high',
    causes: [
      'PHP stopped the script because of an uncaught error or a call to code that does not exist.',
    ],
    debugSteps: [
      'Open the file and line named in the message: PHP prints it after "on line".',
      'Check that the function or class is defined and that its file is loaded (autoload, require).',
      'Turn on error logging for development, and keep display_errors off in production.',
    ],
  },
  {
    id: 'ruby-nil-method',
    pattern: /nomethoderror|undefined method `?\w+'? for nil/i,
    category: 'Runtime',
    severity: 'high',
    causes: ['Ruby called a method on nil: a value that should exist is missing at that point.'],
    debugSteps: [
      'Open the first application frame of the backtrace and find the variable that is nil there.',
      'Check where that variable is set, and why it is not set in this request.',
      'Guard the call with a nil check or fix the lookup that returned nothing.',
    ],
  },
  {
    id: 'nginx-error',
    pattern: /\[error\] \d+#\d+|\[crit\] \d+#\d+|upstream prematurely closed/i,
    category: 'Infrastructure',
    severity: 'high',
    causes: [
      'The web server (nginx) failed while serving the request: a crashed upstream, a file or permission problem, or a limit it reached.',
    ],
    debugSteps: [
      'Read the error text after the [error] tag: it names the file, socket or upstream that failed.',
      'Check that the upstream application is running and reachable from the web server.',
      'Run nginx -t to validate the configuration, then reload it.',
    ],
  },
  {
    id: 'service-failed-to-start',
    pattern: /failed to start |main process exited, code=|job for \S+ failed/i,
    category: 'Infrastructure',
    severity: 'high',
    causes: [
      'A system service exited during start-up: a wrong configuration, a missing file or a port that is already used.',
    ],
    debugSteps: [
      'Read the service log: journalctl -u <service> -n 100 --no-pager.',
      'Test the service command by hand to see its full error output.',
      'Fix the configuration named in the log, then restart the service.',
    ],
  },
  {
    id: 'pod-evicted',
    pattern: /\bevicted\b|the node was low on resource|ephemeral-storage/i,
    category: 'Infrastructure',
    severity: 'medium',
    causes: [
      'Kubernetes removed the pod because its node ran low on memory or disk, and the pod exceeded its requests.',
    ],
    debugSteps: [
      'Run kubectl describe pod and read the reason and the message of the eviction.',
      'Set realistic memory and storage requests and limits for the container.',
      'Check the node disk usage and clean up old images and logs if the disk is full.',
    ],
  },
  {
    id: 'sqlite-locked',
    pattern: /database is locked|sqlite_busy/i,
    category: 'Database',
    severity: 'medium',
    causes: [
      'Another connection holds a write lock on the SQLite file, usually a long transaction or a second process.',
    ],
    debugSteps: [
      'Find the process that holds the file (lsof <file.db>) and check for transactions that are never committed.',
      'Keep transactions short, and set a busy timeout in the driver.',
      'Do not share one SQLite file between many writing processes; use PostgreSQL for that.',
    ],
  },
  {
    id: 'missing-table-or-column',
    pattern:
      /relation "[^"]+" does not exist|column "[^"]+" does not exist|table '[^']+' doesn't exist|no such table|no such column/i,
    category: 'Database',
    severity: 'high',
    causesFor: ({ missingObject }) => [
      `The query uses ${missingObject ?? 'the table or column'}, which does not exist in the database the application connects to.`,
      'The migration that creates it was not run there, or the app points to a different database.',
    ],
    causes: [],
    debugSteps: [
      'Check that the migrations ran on this database, and that DATABASE_URL points to the right one.',
      'Compare the schema of this database with the code (prisma migrate status, or the schema file).',
      'Check the spelling of the table or column name in the query.',
    ],
  },
  {
    id: 'too-many-open-files',
    pattern: /too many open files|emfile|enfile/i,
    category: 'Infrastructure',
    severity: 'high',
    causes: [
      'The process opened more files or sockets than the system allows, usually because connections or file handles are not closed.',
    ],
    debugSteps: [
      'Count the open handles of the process: lsof -p <pid> | wc -l.',
      'Find code that opens files or connections in a loop and does not close them.',
      'Raise the limit (ulimit -n) only after confirming that the handles are released.',
    ],
  },
  {
    id: 'host-unreachable',
    pattern: /ehostunreach|no route to host|enetunreach|network is unreachable/i,
    category: 'Network',
    severity: 'high',
    causes: [
      'There is no network path to the target: wrong address, a firewall rule, or a route that is missing in this network.',
    ],
    debugSteps: [
      'Ping and traceroute the target address from the same machine.',
      'Check the firewall, security groups and the VPN or network the target lives in.',
      'Check the address and port in the configuration.',
    ],
  },
  {
    id: 'connection-aborted',
    pattern: /econnaborted|connection aborted|ssl handshake failed|handshake failure/i,
    category: 'Network',
    severity: 'medium',
    causes: [
      'The connection was cut during setup: a TLS version or cipher mismatch, a proxy in between, or a server that closed it.',
    ],
    debugSteps: [
      'Test the TLS handshake by hand: openssl s_client -connect <host>:<port>.',
      'Compare the TLS versions and ciphers the client and the server support.',
      'Check whether a proxy or a firewall inspects the traffic.',
    ],
  },
  {
    id: 'cloud-access-denied',
    pattern:
      /accessdenied|expiredtoken|the security token included in the request is expired|invalid_grant/i,
    category: 'Access Denied',
    severity: 'high',
    mitre: 'T1078 Valid Accounts',
    owasp: 'A07:2021 Identification and Authentication Failures',
    causes: [
      'The cloud credentials are missing the permission for this action, or they have expired.',
    ],
    debugSteps: [
      'Check which identity the request uses (aws sts get-caller-identity or the equivalent of your provider).',
      'Compare the permissions of that identity with the action named in the error.',
      'Refresh or rotate the expired credentials, and do not store long-lived keys in code.',
    ],
  },
  {
    id: 'invalid-json-body',
    pattern: /json parse error|invalid json|unexpected end of input|failed to decode json/i,
    category: 'Client Error',
    severity: 'medium',
    causes: [
      'The body sent to the server is not valid JSON: a truncated payload, a missing quote, or a wrong Content-Type.',
    ],
    debugSteps: [
      'Print the raw body the client sent and validate it with a JSON linter.',
      'Check that the Content-Type header is application/json when the body is JSON.',
      'Return a clear 400 message from the server for invalid bodies.',
    ],
  },
  {
    id: 'unhandled-exception',
    pattern: /exception in thread "|\b[\w$]+(?:\.[\w$]+)*(?:Exception|Error): /,
    category: 'Runtime',
    severity: 'high',
    causesFor: ({ exceptionName, lastFrame }) => [
      `The exception ${exceptionName ?? '(see the first line)'} was not caught and stopped the thread.`,
      `It was raised at ${lastFrame ?? FAILING_LINE} and was not handled there.`,
    ],
    causes: [],
    debugSteps: [
      'Read the "Caused by" lines at the bottom: the innermost cause is the real problem.',
      'Open the first frame of your own code and check the value used there.',
      'Catch the exception where the program can recover, and log the full stack trace.',
    ],
  },
  {
    id: 'client-error',
    pattern: /"\s4\d{2}\s|\bstatus[=:\s]+4\d{2}\b/i,
    category: 'Client Error',
    severity: 'low',
    causesFor: ({ clientStatus }) => {
      const status = clientStatus ?? '4xx';
      return [
        `The server answered ${status}: ${CLIENT_ERROR_MEANING[status] ?? 'it refused the request because of how the client made it.'}`,
        'Many such answers from one address in a short time mean a scanner or a broken client, not a user.',
      ];
    },
    causes: [],
    debugSteps: [
      'Compare the path and the method in the access log with the routes the application defines.',
      'Look for many 4xx answers from one address: that is a scanner or a broken client.',
      'If the client is your own frontend, fix the link or the request it sends.',
    ],
  },
];

/**
 * Used when no rule matches. It quotes the failing line exactly and says so when
 * there is no failure at all, so the reader never gets a generic answer.
 */
export const FALLBACK_RULE: Rule = {
  id: 'fallback',
  pattern: /./,
  category: 'Runtime',
  causesFor: ({ failureLine, failureLineFields }) => {
    if (failureLine === undefined) {
      return ['The excerpt holds normal activity only: no line in it reports a failure.'];
    }
    const fields = failureLineFields.map(({ label, value }) => `${label} ${value}`);
    const fieldText = fields.length > 0 ? ` Read from the line: ${fields.join('; ')}.` : '';
    return [
      `The failing line is: "${failureLine}".${fieldText}`,
      'The rules hold no entry for this exact message, so the cause is in the code that writes it: search for this text to find the function.',
    ];
  },
  causes: [],
  debugSteps: [
    'Read the first error line and the lines just before it: the cause is usually there.',
    'Reproduce the problem and compare the logs with a run that works.',
    'Search the exact error message together with the name of the library it comes from.',
  ],
};
