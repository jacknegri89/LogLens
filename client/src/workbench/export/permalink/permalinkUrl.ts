const HASH_PREFIX = '#s=';

/** The address of the Workbench holding a share link's data. */
export function buildPermalinkUrl(origin: string, data: string): string {
  return `${origin}/workbench${HASH_PREFIX}${data}`;
}

/** The data after `#s=` in a location hash, or null when the hash is not a share link. */
export function readPermalinkData(hash: string): string | null {
  return hash.startsWith(HASH_PREFIX) ? hash.slice(HASH_PREFIX.length) : null;
}
