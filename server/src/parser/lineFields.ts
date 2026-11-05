/**
 * Pulls the measurable fields out of one log line (time, level, address, code), so a
 * message that no rule knows is still described by what the line itself says.
 */

const FIELD_PATTERNS: { label: string; pattern: RegExp }[] = [
  {
    label: 'time',
    pattern:
      /\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:[.,]\d+)?(?:Z|[+-]\d{2}:?\d{2})?|[A-Z][a-z]{2}\s+\d{1,2} \d{2}:\d{2}:\d{2}|\b\d{2}:\d{2}:\d{2}\b/,
  },
  {
    label: 'level',
    pattern:
      /\b(?:EMERG|ALERT|CRIT(?:ICAL)?|ERR(?:OR)?|WARN(?:ING)?|NOTICE|INFO|DEBUG|TRACE|FATAL)\b/,
  },
  { label: 'address', pattern: /\b(?:\d{1,3}\.){3}\d{1,3}(?::\d{1,5})?\b/ },
  { label: 'hex code', pattern: /\b0x[0-9a-fA-F]+\b/ },
  { label: 'event id', pattern: /\b(?:event ?id|errno|error code|code)[=: ]+\w+/i },
];

/** A measurable field of a log line: what it is (`label`, always English) and what it says. */
export interface LineField {
  label: string;
  value: string;
}

export function extractLineFieldEntries(line: string): LineField[] {
  return FIELD_PATTERNS.flatMap(({ label, pattern }) => {
    const value = line.match(pattern)?.[0];
    if (value) {
      return [{ label, value }];
    }
    return [];
  });
}

/** One "label value" entry per field found in the line, in a fixed order. */
export function extractLineFields(line: string): string[] {
  return extractLineFieldEntries(line).map(({ label, value }) => `${label} ${value}`);
}
