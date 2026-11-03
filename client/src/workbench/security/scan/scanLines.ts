import type { ParsedLine } from '../../types';
import { isBlockableAddress } from './address';
import { findBruteForce } from './bruteForce';
import { detectInLine } from './detect';
import { ATTACK_TYPES } from './signatures';
import type { AddressCount, AttackGroup, AttackHit, AttackTypeId, ScanResult } from './types';

const TOP_ADDRESSES = 5;
const SAMPLE_LINES = 5;

function countAddresses(hits: readonly AttackHit[]): AddressCount[] {
  const counts = new Map<string, number>();
  for (const hit of hits) {
    if (hit.address) counts.set(hit.address, (counts.get(hit.address) ?? 0) + 1);
  }
  const ranked = [...counts].map(([address, count]) => ({ address, count }));
  return ranked.sort(
    (left, right) => right.count - left.count || left.address.localeCompare(right.address),
  );
}

function buildGroup(type: AttackTypeId, hits: AttackHit[]): AttackGroup {
  const lineIndexes = [...new Set(hits.map((hit) => hit.lineIndex))].sort((a, b) => a - b);
  return {
    ...ATTACK_TYPES[type],
    type,
    count: lineIndexes.length,
    topAddresses: countAddresses(hits).slice(0, TOP_ADDRESSES),
    signatureIds: [...new Set(hits.map((hit) => hit.signatureId))],
    samples: lineIndexes.slice(0, SAMPLE_LINES),
  };
}

function groupByType(hits: readonly AttackHit[]): AttackGroup[] {
  const byType = new Map<AttackTypeId, AttackHit[]>();
  for (const hit of hits) byType.set(hit.type, [...(byType.get(hit.type) ?? []), hit]);
  const groups = [...byType].map(([type, typeHits]) => buildGroup(type, typeHits));
  const rank = (group: AttackGroup) => (group.severity === 'high' ? 0 : 1);
  return groups.sort((left, right) => rank(left) - rank(right) || right.count - left.count);
}

/** Looks for attack signals in every line: injection payloads, probes, scanners and brute force. */
export function scanLines(lines: readonly ParsedLine[]): ScanResult {
  const hits = [...lines.flatMap(detectInLine), ...findBruteForce(lines)];
  const highHits = hits.filter((hit) => ATTACK_TYPES[hit.type].severity === 'high');
  return {
    scannedLines: lines.length,
    groups: groupByType(hits),
    highSignals: new Set(highHits.map((hit) => `${hit.type}:${hit.lineIndex}`)).size,
    highAddresses: countAddresses(highHits).map((entry) => entry.address),
    offenders: countAddresses(hits).filter((entry) => isBlockableAddress(entry.address)),
  };
}
