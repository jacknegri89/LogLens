import type { AttackSignature, AttackTypeId, AttackTypeInfo } from './types';

/** OWASP Top 10 (2021) and MITRE ATT&CK for each kind of signal. */
export const ATTACK_TYPES: Record<AttackTypeId, AttackTypeInfo> = {
  sqlInjection: { severity: 'high', owasp: 'A03', mitre: 'T1190' },
  xss: { severity: 'high', owasp: 'A03', mitre: 'T1190' },
  pathTraversal: { severity: 'high', owasp: 'A01', mitre: 'T1190' },
  commandInjection: { severity: 'high', owasp: 'A03', mitre: 'T1059' },
  log4shell: { severity: 'high', owasp: 'A06', mitre: 'T1190' },
  bruteForce: { severity: 'high', owasp: 'A07', mitre: 'T1110' },
  sensitivePath: { severity: 'medium', owasp: 'A05', mitre: 'T1595.003' },
  scannerAgent: { severity: 'medium', owasp: 'A05', mitre: 'T1595.002' },
};

/** The brute force signal comes from counting, not from a pattern. */
export const BRUTE_FORCE_SIGNATURE_ID = 'brute-force';

const SCANNER_NAMES = [
  'sqlmap',
  'nikto',
  'nmap',
  'dirbuster',
  'gobuster',
  'acunetix',
  'masscan',
  'zgrab',
  'wpscan',
  'nuclei',
  'nessus',
  'openvas',
  'w3af',
  'feroxbuster',
];

const SCANNER_SIGNATURES: AttackSignature[] = SCANNER_NAMES.map((name) => ({
  id: `scanner-${name}`,
  type: 'scannerAgent',
  scope: 'text',
  pattern: new RegExp(String.raw`\b${name}\b`),
  waf: { field: 'agent', value: name },
}));

const SQL_SIGNATURES: AttackSignature[] = [
  {
    id: 'sql-union-select',
    type: 'sqlInjection',
    scope: 'text',
    pattern: /\bunion(?:\s+all)?\s*\(?\s*select\b/,
    waf: { field: 'query', value: 'union select' },
  },
  {
    id: 'sql-tautology',
    type: 'sqlInjection',
    scope: 'text',
    pattern:
      /['"`)]\s*(?:or|and)\s+['"]?(\w+)['"]?\s*=\s*['"]?\1\b|\d\s+(?:or|and)\s+(\d+)\s*=\s*\2\b/,
  },
  {
    id: 'sql-empty-string-tautology',
    type: 'sqlInjection',
    scope: 'text',
    pattern: /['"]\s*or\s*['"]{2}\s*=\s*['"]/,
  },
  {
    id: 'sql-time-delay',
    type: 'sqlInjection',
    scope: 'text',
    pattern:
      /(?:\b(?:and|or|select|if)\b|[,;'"(=])\s*\(*\s*sleep\s*\(\s*\d|\b(?:pg_sleep|benchmark)\s*\(\s*\d+\s*[,)]|\bwaitfor\s+delay\s+['"]/,
    waf: { field: 'query', value: 'sleep(' },
  },
  {
    id: 'sql-information-schema',
    type: 'sqlInjection',
    scope: 'text',
    pattern: /\binformation_schema\b/,
    waf: { field: 'query', value: 'information_schema' },
  },
  {
    id: 'sql-comment-terminator',
    type: 'sqlInjection',
    scope: 'text',
    pattern: /['"]\s*;?\s*--(?:\s|$)|\border\s+by\s+\d{1,3}\s*(?:--|#)/,
  },
  {
    id: 'sql-dangerous-function',
    type: 'sqlInjection',
    scope: 'text',
    pattern:
      /\b(?:extractvalue|updatexml|load_file)\s*\(|\binto\s+(?:out|dump)file\b|;\s*(?:drop|truncate)\s+table\b/,
  },
];

const XSS_SIGNATURES: AttackSignature[] = [
  {
    id: 'xss-script-tag',
    type: 'xss',
    scope: 'text',
    pattern: /<\s*\/?\s*script\b/,
    waf: { field: 'query', value: '<script' },
  },
  {
    id: 'xss-event-handler',
    type: 'xss',
    scope: 'text',
    pattern:
      /[\s"'/]on(?:error|load|click|mouseover|mouseout|focus|blur|submit|toggle|animationstart|pointerover)\s*=/,
  },
  {
    id: 'xss-javascript-url',
    type: 'xss',
    scope: 'text',
    pattern:
      /\bjavascript\s*:\s*(?:alert|confirm|prompt|eval|document|window|location|fetch|void|top|self|this|[\w.$]+\s*\()/,
    waf: { field: 'query', value: 'javascript:' },
  },
];

const TRAVERSAL_SIGNATURES: AttackSignature[] = [
  {
    id: 'traversal-dot-dot',
    type: 'pathTraversal',
    scope: 'request',
    pattern: /(?:^|[/\\=?&])\.\.[/\\]|(?:\.\.[/\\]){2,}|\.\.\.\.[/\\]{2}|\.\.;\//,
    waf: { field: 'uri', value: '../' },
  },
  {
    id: 'traversal-system-file',
    type: 'pathTraversal',
    scope: 'text',
    pattern:
      /\/etc\/(?:passwd|shadow)\b|\/proc\/self\/(?:environ|cmdline)|\b[a-z]:[/\\]windows[/\\]system32|\b(?:win|boot)\.ini\b/,
    waf: { field: 'uri', value: '/etc/passwd' },
  },
];

const COMMAND_SIGNATURES: AttackSignature[] = [
  {
    id: 'command-separator',
    type: 'commandInjection',
    scope: 'text',
    pattern:
      /[;|]\s*(?:cat|ls|id|whoami|uname|pwd|wget|curl|nc|ncat|netcat|bash|sh|zsh|python3?|perl|php|rm|chmod|ping|nslookup|echo)\s+(?:-[a-z]|\/|\.|~|https?:|\d{1,3}\.\d{1,3}|\$|["'])/,
  },
  {
    id: 'command-reverse-shell',
    type: 'commandInjection',
    scope: 'text',
    pattern: /\|\s*(?:nc|ncat|netcat)\b(?:\s|$)|\bbash\s+-i\s*>&\s*\/dev\/tcp\/|\/dev\/tcp\/\d/,
  },
  {
    id: 'command-substitution',
    type: 'commandInjection',
    scope: 'text',
    pattern:
      /\$\(\s*(?:id|whoami|uname|cat|ls|curl|wget|nc|bash|sh|sleep|ping|echo)\b|`\s*(?:id|whoami|uname|cat|ls|curl|wget|sleep|ping)\b[^`]{0,100}`|\$\{ifs\}/,
  },
  {
    id: 'command-short',
    type: 'commandInjection',
    scope: 'text',
    pattern: /;\s*(?:id|whoami|uname(?:\s+-a)?)(?=\s+http|\s*["']|\s*$|\s*[;|&])/,
  },
];

const LOG4SHELL_SIGNATURES: AttackSignature[] = [
  {
    id: 'log4shell-jndi',
    type: 'log4shell',
    scope: 'text',
    pattern: /\$\{\s*jndi\s*:/,
    waf: { field: 'uri', value: '${jndi:' },
  },
  {
    id: 'log4shell-obfuscated',
    type: 'log4shell',
    scope: 'text',
    pattern:
      /\$\{[^}]{0,40}\$\{(?:lower|upper|::-|env|sys|date|java|ctx)[^}]{0,40}\}[^}]{0,40}ndi:|\$\{(?:\$\{[^{}]{1,40}\}){3,}/,
  },
];

function sensitivePath(id: string, pattern: RegExp, value: string): AttackSignature {
  return { id, type: 'sensitivePath', scope: 'request', pattern, waf: { field: 'path', value } };
}

const SENSITIVE_PATH_SIGNATURES: AttackSignature[] = [
  sensitivePath('path-env', /\/\.env(?![a-z0-9_-])/, '/.env'),
  sensitivePath('path-git', /\/\.git\/(?:config|head|index|logs)/, '/.git/'),
  sensitivePath('path-aws', /\/\.aws\/credentials/, '/.aws/credentials'),
  sensitivePath('path-ssh', /\/\.ssh\//, '/.ssh/'),
  sensitivePath('path-htpasswd', /\/\.ht(?:passwd|access)/, '/.htpasswd'),
  sensitivePath('path-wp-admin', /\/wp-admin(?![a-z0-9_-])(?!\/admin-ajax\.php)/, '/wp-admin'),
  sensitivePath('path-wp-login', /\/wp-login\.php/, '/wp-login.php'),
  sensitivePath('path-xmlrpc', /\/xmlrpc\.php/, '/xmlrpc.php'),
  sensitivePath('path-phpmyadmin', /\/phpmyadmin(?![a-z0-9_-])/, '/phpmyadmin'),
  sensitivePath('path-server-status', /\/server-status(?![a-z0-9_-])/, '/server-status'),
  sensitivePath('path-actuator-env', /\/actuator\/env(?![a-z0-9_-])/, '/actuator/env'),
  sensitivePath(
    'path-actuator-heapdump',
    /\/actuator\/heapdump(?![a-z0-9_-])/,
    '/actuator/heapdump',
  ),
];

export const SIGNATURES: readonly AttackSignature[] = [
  ...SQL_SIGNATURES,
  ...XSS_SIGNATURES,
  ...TRAVERSAL_SIGNATURES,
  ...COMMAND_SIGNATURES,
  ...LOG4SHELL_SIGNATURES,
  ...SENSITIVE_PATH_SIGNATURES,
  ...SCANNER_SIGNATURES,
];

const SIGNATURE_BY_ID = new Map(SIGNATURES.map((signature) => [signature.id, signature]));

export function signatureById(id: string): AttackSignature | undefined {
  return SIGNATURE_BY_ID.get(id);
}
