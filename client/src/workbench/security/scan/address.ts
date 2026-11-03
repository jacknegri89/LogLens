const IPV4_OCTET = String.raw`(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)`;
const IPV4_TEXT = String.raw`(?:${IPV4_OCTET}\.){3}${IPV4_OCTET}`;
const IPV4_STRICT = new RegExp(`^${IPV4_TEXT}$`);
const IPV4_CANDIDATE = new RegExp(String.raw`(?<![\w.])${IPV4_TEXT}(?!\w|\.\d)`, 'g');
const IPV6_CANDIDATE = /(?<![\w:.])(?:[0-9a-f]{0,4}:){2,7}[0-9a-f]{0,4}(?![\w:.])/gi;
const HEX_GROUP = /^[0-9a-f]{1,4}$/i;

/** Field names that hold the client address, most reliable first. */
const ADDRESS_FIELDS = [
  'client_ip',
  'clientip',
  'remote_addr',
  'remote_ip',
  'src_ip',
  'source_ip',
  'ip',
  'src',
  'remote',
  'x_forwarded_for',
];

/** Dotted IPv4 with every number from 0 to 255 and no leading zero. */
export function isValidIpv4(value: string): boolean {
  return IPV4_STRICT.test(value);
}

/** Plain IPv6 text: hexadecimal groups with at most one "::". Zone ids and IPv4 tails are refused. */
export function isValidIpv6(value: string): boolean {
  if (!/^[0-9a-f:]+$/i.test(value)) return false;
  const halves = value.split('::');
  if (halves.length > 2) return false;
  const groups = halves.flatMap((half) => (half === '' ? [] : half.split(':')));
  if (!groups.every((group) => HEX_GROUP.test(group))) return false;
  return halves.length === 2 ? groups.length <= 7 : groups.length === 8;
}

/** The address in its one written form (IPv6 in lower case), or null when it is not a valid address. */
export function canonicalAddress(value: string): string | null {
  const trimmed = value.trim();
  if (isValidIpv4(trimmed)) return trimmed;
  return isValidIpv6(trimmed) ? trimmed.toLowerCase() : null;
}

/** Loopback, unspecified and broadcast addresses are never worth blocking. */
export function isBlockableAddress(address: string): boolean {
  if (!isValidIpv4(address)) return address !== '::' && address !== '::1';
  return !address.startsWith('127.') && address !== '0.0.0.0' && address !== '255.255.255.255';
}

function firstValidMatch(pattern: RegExp, text: string): { address: string; index: number } | null {
  for (const match of text.matchAll(pattern)) {
    const address = canonicalAddress(match[0]);
    if (address) return { address, index: match.index };
  }
  return null;
}

function addressFromFields(fields: Record<string, string>): string | null {
  for (const name of ADDRESS_FIELDS) {
    const first = fields[name]?.split(',')[0];
    const address = first ? canonicalAddress(first) : null;
    if (address) return address;
  }
  return null;
}

/** The client address of a line: a known field first, otherwise the first address written in the text. */
export function extractAddress(raw: string, fields: Record<string, string>): string | null {
  const fromField = addressFromFields(fields);
  if (fromField) return fromField;
  const candidates = [firstValidMatch(IPV4_CANDIDATE, raw), firstValidMatch(IPV6_CANDIDATE, raw)];
  const found = candidates.filter((candidate) => candidate !== null);
  found.sort((left, right) => left.index - right.index);
  return found[0]?.address ?? null;
}
