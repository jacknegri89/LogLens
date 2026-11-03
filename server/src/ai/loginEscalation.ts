import { MIN_FAILED_LOGINS_BEFORE_SUCCESS } from '../content/correlations';

/** Failed logins from one address followed by an accepted login from the same address. */
export interface LoginEscalation {
  address: string;
  user: string;
  failedLogins: number;
}

/** Each pattern captures the source address of a failed login in its first group. */
const FAILED_LOGIN_PATTERNS = [
  /failed password for (?:invalid user )?\S+ from (\S+)/i,
  /invalid user \S+ from (\S+)/i,
  /authentication failure;.*\brhost=(\S+)/i,
];
const ACCEPTED_LOGIN =
  /accepted (?:password|publickey|keyboard-interactive\/pam) for (\S+) from (\S+)/i;

function failedLoginAddress(line: string): string | null {
  for (const pattern of FAILED_LOGIN_PATTERNS) {
    const address = pattern.exec(line)?.[1];
    if (address) return address;
  }
  return null;
}

/**
 * Looks for a possible successful brute force: enough failed logins from an address and,
 * LATER in the log, an accepted login from that same address. One mistyped password followed
 * by a login is a normal user, so the failures must reach a minimum before this fires.
 */
export function findLoginEscalation(lines: string[]): LoginEscalation | null {
  const failuresByAddress = new Map<string, number>();
  for (const line of lines) {
    const failedAddress = failedLoginAddress(line);
    if (failedAddress) {
      failuresByAddress.set(failedAddress, (failuresByAddress.get(failedAddress) ?? 0) + 1);
      continue;
    }
    const accepted = ACCEPTED_LOGIN.exec(line);
    const failedLogins = accepted ? (failuresByAddress.get(accepted[2]) ?? 0) : 0;
    if (accepted && failedLogins >= MIN_FAILED_LOGINS_BEFORE_SUCCESS) {
      return { address: accepted[2], user: accepted[1], failedLogins };
    }
  }
  return null;
}
