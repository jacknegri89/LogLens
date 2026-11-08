import { SUSPICIOUS_CATEGORIES } from '../content/correlations';
import { overviewText } from '../content/localized';
import type { Language } from '../types/language';
import { pickRule } from './ruleMatching';
import type { TimelineEvent } from './eventTimeline';

type EntityKind = 'address' | 'user';

interface Entity {
  kind: EntityKind;
  /** What two lines must have in common to count as the same entity (an address without its port). */
  key: string;
  /** How it is written in the line: an address keeps its port. */
  shown: string;
}

interface SharedEntity {
  kind: EntityKind;
  key: string;
  shown: string;
  events: TimelineEvent[];
}

const IPV4 = /(?<![\w.])((?:\d{1,3}\.){3}\d{1,3})(?::(\d{1,5}))?(?!\w)/g;
const IPV6 =
  /(?<![\w:])((?:[0-9a-f]{1,4}:){7}[0-9a-f]{1,4}|(?:[0-9a-f]{1,4}:){1,7}:(?:[0-9a-f]{1,4}(?::[0-9a-f]{1,4}){0,5})?)(?![\w:])/gi;
/** Each pattern captures a user name in its first group. */
const USER_PATTERNS = [
  /failed password for (?:invalid user )?(\S+) from/i,
  /accepted \S+ for (\S+) from/i,
  /invalid user (\S+) from/i,
  /\bfor user ["']?([^"'\s@]+)/i,
  /\buser(?:name)?[=:]\s*["']?([\w.@-]+)/i,
];

function isUsableIpv4(address: string): boolean {
  const octets = address.split('.').map(Number);
  const isLocal = octets[0] === 127 || octets.every((octet) => octet === 0);
  return octets.every((octet) => octet <= 255) && !isLocal;
}

function extractAddresses(line: string): Entity[] {
  const ipv4 = [...line.matchAll(IPV4)]
    .filter((match) => isUsableIpv4(match[1]))
    .map((match): Entity => ({ kind: 'address', key: match[1], shown: match[0] }));
  const ipv6 = [...line.matchAll(IPV6)].map((match): Entity => ({
    kind: 'address',
    key: match[1].toLowerCase(),
    shown: match[1],
  }));
  return [...ipv4, ...ipv6];
}

function extractUsers(line: string): Entity[] {
  return USER_PATTERNS.flatMap((pattern) => {
    const user = pattern.exec(line)?.[1];
    if (user) {
      return [{ kind: 'user' as const, key: user, shown: user }];
    }
    return [];
  });
}

/** Addresses and user names written in one line. */
function extractEntities(line: string): Entity[] {
  return [...extractAddresses(line), ...extractUsers(line)];
}

function groupByKey(
  timeline: TimelineEvent[],
  kind: EntityKind,
): Map<string, { shown: Set<string>; events: Set<TimelineEvent> }> {
  const groups = new Map<string, { shown: Set<string>; events: Set<TimelineEvent> }>();
  for (const event of timeline) {
    for (const entity of extractEntities(event.finding.evidence)) {
      if (entity.kind !== kind) {
        continue;
      }
      const group = groups.get(entity.key) ?? { shown: new Set(), events: new Set() };
      group.shown.add(entity.shown);
      group.events.add(event);
      groups.set(entity.key, group);
    }
  }
  return groups;
}

/** The entities of one kind that appear in the evidence of two or more different findings. */
function findShared(timeline: TimelineEvent[], kind: EntityKind): SharedEntity[] {
  return [...groupByKey(timeline, kind)]
    .filter(([, group]) => group.events.size >= 2)
    .map(([key, group]) => {
      // Different ports on one address are different connections: show the address alone.
      let shown = key;
      if (group.shown.size === 1) {
        shown = [...group.shown][0];
      }
      return { kind, key, shown, events: [...group.events] };
    });
}

function categoriesOf(shared: SharedEntity): string {
  return [...new Set(shared.events.map((event) => event.finding.category))].join(', ');
}

function allSuspicious(shared: SharedEntity): boolean {
  return shared.events.every((event) => SUSPICIOUS_CATEGORIES.includes(event.finding.category));
}

/** Lines of the excerpt that mention the address and are attacks, failed logins or refused requests. */
function countSuspiciousLines(lines: string[], address: string): number {
  return lines.filter((line) => {
    const mentionsAddress = extractAddresses(line).some((entity) => entity.key === address);
    return mentionsAddress && SUSPICIOUS_CATEGORIES.includes(pickRule(line).category);
  }).length;
}

function describeAddress(shared: SharedEntity, lines: string[], language: Language): string {
  const categories = categoriesOf(shared);
  const text = overviewText(language);
  if (allSuspicious(shared)) {
    const count = countSuspiciousLines(lines, shared.key);
    return text.sameAttacker(shared.shown, count, categories);
  }
  return text.sameHost(shared.shown, shared.events.length, categories);
}

/**
 * One sentence for an address and one for a user name that show up in the evidence of
 * several findings. A user name is reported only among suspicious events: the same word can
 * be an operating system account in one line and a database account in another.
 */
export function describeSharedEntities(
  lines: string[],
  timeline: TimelineEvent[],
  language: Language,
): string[] {
  const address = findShared(timeline, 'address')[0];
  const user = findShared(timeline, 'user').find(allSuspicious);
  const { sameUser } = overviewText(language);
  const descriptions: string[] = [];
  if (address) {
    descriptions.push(describeAddress(address, lines, language));
  }
  if (user) {
    descriptions.push(sameUser(user.shown, user.events.length, categoriesOf(user)));
  }
  return descriptions;
}
