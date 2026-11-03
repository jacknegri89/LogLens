import { canonicalAddress, isBlockableAddress, isValidIpv6 } from './address';
import { signatureById } from './signatures';
import type { ScanResult, WafField, WafHint } from './types';

export type MitigationId =
  | 'iptables'
  | 'ufw'
  | 'cloudflareAddresses'
  | 'cloudflarePatterns'
  | 'nginx'
  | 'fail2ban';

export interface MitigationSnippet {
  id: MitigationId;
  code: string;
}

/** Longest list of addresses written into one snippet, so a copied command stays usable. */
export const MAX_BLOCKED_ADDRESSES = 100;

const CLOUDFLARE_FIELDS: Record<WafField, string> = {
  path: 'http.request.uri.path',
  query: 'lower(http.request.uri.query)',
  agent: 'lower(http.user_agent)',
  uri: 'lower(http.request.uri)',
};

/**
 * Safety rule of this file: a command or rule is built only from (1) addresses that pass the strict
 * IPv4 / IPv6 check again here, and (2) fixed constants of our signature tables. Text copied from a
 * log line never reaches the output.
 */
function safeAddresses(offenders: ScanResult['offenders']): string[] {
  const valid = offenders
    .map((entry) => canonicalAddress(entry.address))
    .filter((address): address is string => address !== null && isBlockableAddress(address));
  return [...new Set(valid)].slice(0, MAX_BLOCKED_ADDRESSES);
}

function wafHints(signatureIds: readonly string[]): WafHint[] {
  const hints = signatureIds.flatMap((id) => signatureById(id)?.waf ?? []);
  return hints.filter(
    (hint, position) => hints.findIndex((other) => sameHint(other, hint)) === position,
  );
}

function sameHint(left: WafHint, right: WafHint): boolean {
  return left.field === right.field && left.value === right.value;
}

function escapeRegexLiteral(constant: string): string {
  return constant.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
}

function iptablesCommands(addresses: string[]): string {
  return addresses
    .map(
      (address) =>
        `${isValidIpv6(address) ? 'ip6tables' : 'iptables'} -A INPUT -s ${address} -j DROP`,
    )
    .join('\n');
}

function cloudflarePatternRule(hints: WafHint[]): string {
  return hints
    .map((hint) => `(${CLOUDFLARE_FIELDS[hint.field]} contains "${hint.value}")`)
    .join(' or ');
}

function fail2banSnippet(hints: WafHint[], withLoginFailures: boolean): string {
  const paths = hints.filter((hint) => hint.field === 'path');
  const regexes = paths.map(
    (hint) => `^<HOST> .* "(?:GET|POST|HEAD) [^"]*${escapeRegexLiteral(hint.value)}`,
  );
  if (withLoginFailures) regexes.push('^<HOST> .* "(?:GET|POST) [^"]*" (?:401|403) ');
  if (regexes.length === 0) return '';
  return [
    '# /etc/fail2ban/filter.d/loglens-probes.conf',
    '[Definition]',
    `failregex = ${regexes.join('\n            ')}`,
    'ignoreregex =',
    '',
    '# /etc/fail2ban/jail.d/loglens-probes.local',
    '[loglens-probes]',
    'enabled = true',
    'port = http,https',
    'filter = loglens-probes',
    'logpath = /var/log/nginx/access.log',
    'maxretry = 5',
    'findtime = 300',
    'bantime = 3600',
  ].join('\n');
}

function patternSnippets(result: ScanResult): MitigationSnippet[] {
  const hints = wafHints(result.groups.flatMap((group) => group.signatureIds));
  const withLoginFailures = result.groups.some((group) => group.type === 'bruteForce');
  const candidates: MitigationSnippet[] = [
    { id: 'cloudflarePatterns', code: cloudflarePatternRule(hints) },
    { id: 'fail2ban', code: fail2banSnippet(hints, withLoginFailures) },
  ];
  return candidates.filter((snippet) => snippet.code !== '');
}

function addressSnippets(addresses: string[]): MitigationSnippet[] {
  if (addresses.length === 0) return [];
  return [
    { id: 'iptables', code: iptablesCommands(addresses) },
    { id: 'ufw', code: addresses.map((address) => `ufw deny from ${address}`).join('\n') },
    {
      id: 'cloudflareAddresses',
      code: addresses.map((address) => `(ip.src eq ${address})`).join(' or '),
    },
    { id: 'nginx', code: addresses.map((address) => `deny ${address};`).join('\n') },
  ];
}

/** Ready-to-copy blocks for the offending addresses and the probed patterns; empty when nothing was found. */
export function buildMitigation(result: ScanResult): MitigationSnippet[] {
  return [...addressSnippets(safeAddresses(result.offenders)), ...patternSnippets(result)];
}
