import type { ParsedLine } from '../../types';
import { extractAddress } from './address';
import { decodeForMatching, requestTarget } from './decode';
import { SIGNATURES } from './signatures';
import type { AttackHit } from './types';

/** The signals of the patterns in one line (brute force is counted across lines, elsewhere). */
export function detectInLine(line: ParsedLine): AttackHit[] {
  const decoded = decodeForMatching(line.raw);
  const target = requestTarget(line.raw, line.fields);
  const matching = SIGNATURES.filter((signature) => {
    const subject = signature.scope === 'request' ? target : decoded;
    return subject !== null && signature.pattern.test(subject);
  });
  if (matching.length === 0) return [];
  const address = extractAddress(line.raw, line.fields);
  return matching.map((signature) => ({
    lineIndex: line.index,
    type: signature.type,
    signatureId: signature.id,
    address,
  }));
}
