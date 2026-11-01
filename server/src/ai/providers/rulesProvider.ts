import type { Severity } from '../../types/report';
import type { AIProvider, AnalyzeInput } from '../AIProvider';
import { aiReportSchema, type AIReport } from '../schema';

/**
 * One known kind of failure: how to recognise it in a log, and what to tell the
 * reader about it. Rules are checked in order, the first match wins.
 */
interface Rule {
  pattern: RegExp;
  category: string;
  severity?: Severity;
  causes: string[];
  debugSteps: string[];
}

const RULES: Rule[] = [
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
    severity: 'medium',
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
    severity: 'medium',
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
    pattern: /etimedout|timed out|timeout|deadline exceeded/i,
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
];

const FALLBACK_RULE: Rule = {
  pattern: /./,
  category: 'Runtime',
  causes: ['The log shows a failure, but it does not match any known pattern.'],
  debugSteps: [
    'Read the first error line and the lines just before it: the cause is usually there.',
    'Reproduce the problem and compare the logs with a run that works.',
    'Search the exact error message together with the name of the library it comes from.',
  ],
};

const FAILURE_LINE = /error|exception|fatal|fail|refused|killed|timeout|denied/i;
const MAX_KEY_LINES = 6;
const MAX_TITLE_LENGTH = 100;

function pickRule(text: string): Rule {
  return RULES.find((rule) => rule.pattern.test(text)) ?? FALLBACK_RULE;
}

function pickKeyLines(lines: string[], rule: Rule): string[] {
  const matching = lines.filter((line) => rule.pattern.test(line) || FAILURE_LINE.test(line));
  const chosen = matching.length > 0 ? matching : lines;
  return [...new Set(chosen)].slice(0, MAX_KEY_LINES);
}

/** Drops a leading "timestamp LEVEL" prefix so the title reads as a plain message. */
function makeTitle(keyLines: string[]): string {
  const first = keyLines[0] ?? '';
  const withoutPrefix = first.replace(/^\S+\s+(?:INFO|WARN|ERROR|DEBUG|FATAL)\s+/i, '');
  return withoutPrefix.trim().slice(0, MAX_TITLE_LENGTH) || 'Unknown issue';
}

function buildIssue(title: string, severity: Severity, rule: Rule, keyLines: string[]): string {
  return [
    `## ${title}`,
    '',
    `**Severity:** ${severity}`,
    `**Category:** ${rule.category}`,
    '',
    '### Log lines',
    '',
    '```',
    ...keyLines,
    '```',
    '',
    '### Probable causes',
    '',
    ...rule.causes.map((cause) => `- ${cause}`),
    '',
    '### Suggested next steps',
    '',
    ...rule.debugSteps.map((step, index) => `${index + 1}. ${step}`),
    '',
    '_Report generated by the LogLens rules engine._',
  ].join('\n');
}

/**
 * Analyses a log with a table of known failures instead of calling a model.
 * It needs no key and no network, and the same log always gives the same
 * report. It recognises common problems; for anything else it says so.
 */
export class RulesProvider implements AIProvider {
  readonly name = 'rules';

  analyze({ excerpt, severityHint }: AnalyzeInput): Promise<AIReport> {
    const lines = excerpt.split('\n').filter((line) => line.trim() !== '');
    const rule = pickRule(excerpt);
    const keyLines = pickKeyLines(lines, rule);
    const title = makeTitle(keyLines);
    const severity = rule.severity ?? severityHint;

    const report = aiReportSchema.parse({
      title,
      severity,
      category: rule.category,
      keyLines,
      causes: rule.causes,
      debugSteps: rule.debugSteps,
      bugReportMarkdown: buildIssue(title, severity, rule, keyLines),
    });

    return Promise.resolve(report);
  }
}
