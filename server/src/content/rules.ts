/**
 * Knowledge base of the rules engine: the failures it recognises and the advice
 * shown to the reader. Everything a visitor reads here lives in this file, so the
 * wording can change without touching the engine in `rulesProvider.ts`.
 */
import type { Severity } from '../types/report';

/**
 * One known kind of failure: how to recognise it in a log, and what to tell the
 * reader about it. Rules are checked in order, the first match wins.
 */
export interface Rule {
  pattern: RegExp;
  category: string;
  severity?: Severity;
  /** Raises the severity to critical when the log also shows a server error (5xx). */
  criticalOnServerError?: boolean;
  causes: string[];
  /** Builds the causes from the log when its details make the cause specific. Replaces `causes`. */
  causesFor?: (excerpt: string) => string[];
  debugSteps: string[];
}

/** Scanner names and injection payloads that mark a request as an attack. */
export const ATTACK_SIGNATURE =
  /sqlmap|\bnikto\b|\bnmap\b|dirbuster|gobuster|acunetix|union(?:\s|%20|\+)+select|(?:'|%27)(?:\s|%20|\+)*or(?:\s|%20|\+)+\d+(?:=|%3d)\d+|sleep\(\d+\)|<script|\.\.\/\.\.\//i;

export const FAILURE_LINE =
  /\berror\b|[a-z]Error\b|exception|\bfatal\b|\bfail(?:ed|ure|s)?\b|refused|killed|\btimeout\b|timed out|denied|traceback/i;

/** The innermost frame of a Python or Java traceback: where the failure really happened. */
function lastFrame(excerpt: string): string {
  const pythonFrames = [...excerpt.matchAll(/File "([^"]+)", line (\d+), in (\S+)/g)];
  const last = pythonFrames.at(-1);
  if (last) return `${last[1]}, line ${last[2]}, in ${last[3]}`;
  const javaFrames = [...excerpt.matchAll(/^\s*at ([\w$.]+)\(([^)]+)\)/gm)];
  const lastJava = javaFrames.at(-1);
  if (lastJava) return `${lastJava[1]} (${lastJava[2]})`;
  return 'the failing line of the log';
}

const CLIENT_ERROR_MEANING: Record<string, string> = {
  '400': 'the request is malformed or has invalid parameters.',
  '404': 'the path does not exist on this server.',
  '405': 'the HTTP method (GET, POST, ...) is not allowed on this path.',
  '408': 'the client was too slow to send the request.',
  '413': 'the request body is larger than the server accepts.',
};

export const RULES: Rule[] = [
  {
    pattern: ATTACK_SIGNATURE,
    category: 'Security Attack',
    severity: 'high',
    criticalOnServerError: true,
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
    pattern: /password authentication failed for user/i,
    category: 'Database Connection Failure',
    severity: 'high',
    causesFor: (excerpt) => {
      const user = excerpt.match(/for user "?([^"\s]+)"?/i)?.[1] ?? 'the configured user';
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
    pattern:
      /unable to verify the first certificate|self[- ]signed certificate|certificate has expired|cert_has_expired|ssl routines|unable_to_verify_leaf_signature/i,
    category: 'Network',
    severity: 'medium',
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
    pattern: /\bTypeError\b/,
    category: 'Runtime',
    severity: 'high',
    causesFor: (excerpt) => {
      const message =
        excerpt.match(/TypeError: ([^\n]+)/)?.[1]?.trim() ?? 'a value of the wrong type';
      return [
        `A call received a value of the wrong type: ${message}.`,
        'The value comes from input or data whose type the code does not check before using it.',
      ];
    },
    causes: [],
    debugSteps: [
      'Open the file and line named in the message or in the last stack frame.',
      'Print the type of the value passed there (typeof, type() or gettype()) just before the call.',
      'Convert or validate the input where it enters the code, and reject a wrong type with a clear error.',
    ],
  },
  {
    pattern: /\bIndexError\b|(?:list|string|tuple) index out of range/i,
    category: 'Runtime',
    severity: 'high',
    causesFor: (excerpt) => [
      `An index is read beyond the end of a sequence at ${lastFrame(excerpt)}: the list, string or tuple is shorter than the code expects.`,
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
    pattern: /violates (?:not-null|not null) constraint|null value in column/i,
    category: 'Database',
    severity: 'high',
    causesFor: (excerpt) => {
      const column = excerpt.match(/column "([^"]+)"/i)?.[1] ?? 'a required column';
      return [
        `The INSERT or UPDATE writes NULL into ${column}, which the table does not allow.`,
        'The code builds the row without a value for this field, often because the input was missing or an earlier step failed.',
      ];
    },
    causes: [],
    debugSteps: [
      'Find the code that builds the row and check that every NOT NULL column receives a value.',
      'Validate the required fields before the insert, and return a clear error when one is missing.',
      'Compare the table definition (\\d <table> in psql) with the fields the code sends.',
    ],
  },
  {
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
    pattern: /deadlock detected|too many connections|remaining connection slots/i,
    category: 'Database',
    severity: 'high',
    causes: [
      'Too many connections are open: each request or function opens its own.',
      'Two transactions wait for each other and neither can continue.',
    ],
    debugSteps: [
      'Reuse one shared connection pool instead of opening connections per request.',
      'On serverless platforms, connect through the pooled connection string.',
      'Keep transactions short and always lock rows in the same order.',
    ],
  },
  {
    pattern: /failed password for|invalid user \S+ from|authentication failure;.*rhost=/i,
    category: 'Security Attack',
    severity: 'high',
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
    pattern:
      /\bKeyError\b|\bValueError\b|\bAttributeError\b|\bZeroDivisionError\b|\bRecursionError\b/,
    category: 'Runtime',
    severity: 'high',
    causesFor: (excerpt) => [
      `The exception is raised at ${lastFrame(excerpt)} and was not handled there.`,
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
    pattern: /access denied for user/i,
    category: 'Database Connection Failure',
    severity: 'high',
    causesFor: (excerpt) => {
      const user =
        excerpt.match(/access denied for user '?([^'\s@]+)/i)?.[1] ?? 'the configured user';
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
    pattern: /"\s4\d{2}\s|\bstatus[=:\s]+4\d{2}\b/i,
    category: 'Client Error',
    severity: 'low',
    causesFor: (excerpt) => {
      const code = excerpt.match(/"\s(4\d{2})\s|\bstatus[=:\s]+(4\d{2})\b/i);
      const status = code?.[1] ?? code?.[2] ?? '4xx';
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

/** The first line that reports a failure, or null when the excerpt has none. */
function firstFailureLine(excerpt: string): string | null {
  const lines = excerpt.split('\n').filter((line) => line.trim() !== '');
  return lines.find((line) => FAILURE_LINE.test(line)) ?? null;
}

/**
 * Used when no rule matches. It quotes the failing line exactly and says so when
 * there is no failure at all, so the reader never gets a generic answer.
 */
export const FALLBACK_RULE: Rule = {
  pattern: /./,
  category: 'Runtime',
  causesFor: (excerpt) => {
    const line = firstFailureLine(excerpt);
    if (line === null) {
      return ['The excerpt holds normal activity only: no line in it reports a failure.'];
    }
    return [
      `The failing line is: "${line}". No known rule covers this message, so search the code for this exact text to find the function that writes it.`,
    ];
  },
  causes: [],
  debugSteps: [
    'Read the first error line and the lines just before it: the cause is usually there.',
    'Reproduce the problem and compare the logs with a run that works.',
    'Search the exact error message together with the name of the library it comes from.',
  ],
};
