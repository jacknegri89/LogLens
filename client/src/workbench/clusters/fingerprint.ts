const MAX_TEMPLATE_LENGTH = 300;
const MAX_FINGERPRINT_INPUT_LENGTH = 2_000;

/** Replaced in this order: the specific shapes first, plain numbers last. */
const REPLACEMENTS: ReadonlyArray<[pattern: RegExp, placeholder: string]> = [
  [/(?<![\w])'[^'\n]{0,80}'(?![\w])/g, '<str>'],
  [/(?<![\w.+-])[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, '<email>'],
  [/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, '<uuid>'],
  [/\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:[.,]\d+)?(?:Z|[+-]\d{2}:?\d{2})?/g, '<time>'],
  [/\b\d{1,2}:\d{2}:\d{2}(?:[.,]\d+)?\b/g, '<time>'],
  [/\b\d{1,3}(?:\.\d{1,3}){3}(?::\d+)?\b/g, '<ip>'],
  [/(?<![\w:])(?:[0-9a-f]{1,4}:){2,7}[0-9a-f]{1,4}\b/gi, '<ip>'],
  [/(?<![\w:])(?:[0-9a-f]{1,4}:){1,6}:(?:[0-9a-f]{1,4})?(?![\w:])/gi, '<ip>'],
  [/(?<![\w:])::1(?![\w:])/g, '<ip>'],
  [/\b0x[0-9a-f]+\b/gi, '<hex>'],
  [/\b(?=[0-9a-f]*\d)(?=[0-9a-f]*[a-f])[0-9a-f]{8,}\b/gi, '<hex>'],
  [/(?<![\w.])\d+(?:\.\d+)?(?:ms|us|µs|s|kb|mb|gb|b|%)?(?![\w])/gi, '<n>'],
];

/** `key=value` pairs whose value changes on every request: ids, users, addresses, sizes, times. */
const KEY_VALUE = /\b([A-Za-z_][\w.-]*)=(\S+)/g;
const NOISY_KEY =
  /(?:^|[._-])(?:id|ip|token|session|uid|hash)$|[a-z](?:Id|Ip|Token|Uid|Hash)$|^(?:user|username|host|hostname|addr|address|key|ts|time|timestamp|duration|latency|elapsed|took|size|bytes|port|pid|tid|count)$/;

/** Double-quoted values become <str>, but a JSON key (followed by a colon) keeps its name. */
function replaceQuotedValues(text: string): string {
  return text.replace(/"(?:[^"\\]|\\.)*"(\s*:)?/g, (whole, colon?: string) => {
    if (colon) {
      return whole;
    }
    return '<str>';
  });
}

function normalizeNoisyValues(text: string): string {
  return text.replace(KEY_VALUE, (whole, key: string) => {
    if (NOISY_KEY.test(key)) {
      return `${key}=<v>`;
    }
    return whole;
  });
}

function limitInput(message: string): string {
  if (message.length <= MAX_FINGERPRINT_INPUT_LENGTH) {
    return message;
  }
  const prefix = message.slice(0, MAX_FINGERPRINT_INPUT_LENGTH);
  let quoteStart = -1;
  let escaped = false;
  for (let index = 0; index < prefix.length; index += 1) {
    const character = prefix[index];
    if (quoteStart >= 0 && escaped) {
      escaped = false;
      continue;
    }
    if (quoteStart >= 0 && character === '\\') {
      escaped = true;
      continue;
    }
    if (character === '"') {
      if (quoteStart < 0) {
        quoteStart = index;
      } else {
        quoteStart = -1;
      }
    }
  }
  // Do not expose a partial quoted value when its closing quote falls beyond the limit.
  if (quoteStart < 0) {
    return prefix;
  }
  return `${prefix.slice(0, quoteStart)}"..."`;
}

/**
 * The message with its variable parts replaced by placeholders, so two lines that differ only by
 * ids, numbers, times or addresses give the same template. Words and structure are kept.
 */
export function fingerprint(message: string): string {
  // Limit work on untrusted long lines before applying the normalization patterns.
  let template = replaceQuotedValues(limitInput(message));
  for (const [pattern, placeholder] of REPLACEMENTS) {
    template = template.replace(pattern, placeholder);
  }
  return normalizeNoisyValues(template).replace(/\s+/g, ' ').trim().slice(0, MAX_TEMPLATE_LENGTH);
}
