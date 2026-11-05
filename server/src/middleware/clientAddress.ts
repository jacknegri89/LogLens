/**
 * The network address of the caller, used to count its analyses.
 *
 * `X-Forwarded-For` is trusted only behind a proxy we control (TRUST_PROXY=true).
 * Otherwise any client could send a made-up address and get a fresh rate-limit
 * bucket on every request. Behind a proxy, the last entry is the one the nearest
 * proxy appended, so the client cannot forge it.
 */
export function clientAddress(
  forwardedFor: string | undefined,
  socketAddress: string,
  trustProxy: boolean,
): string {
  if (!trustProxy || !forwardedFor) {
    return socketAddress;
  }
  const entries = forwardedFor
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry !== '');
  return entries.at(-1) ?? socketAddress;
}
