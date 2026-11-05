const NAMED_ESCAPES: Record<string, string> = {
  '\\': '\\\\',
  '"': '\\"',
  '\n': '\\n',
  '\r': '\\r',
  '\t': '\\t',
};

/** Control codes, the C1 range and the Unicode line separators: anything that can end a line. */
export function isUnsafeCode(code: number): boolean {
  return code <= 0x1f || (code >= 0x7f && code <= 0x9f) || code === 0x2028 || code === 0x2029;
}

function escapeCharacter(character: string): string {
  const code = character.charCodeAt(0);
  if (character in NAMED_ESCAPES) {
    return NAMED_ESCAPES[character];
  }
  if (!isUnsafeCode(code)) {
    return character;
  }
  return '\\u' + code.toString(16).padStart(4, '0');
}

/**
 * A double-quoted string with C-style escapes. The same escapes are valid in YAML, JSON,
 * PromQL and LogQL, so one function serves all four.
 */
export function doubleQuoted(value: string): string {
  return '"' + Array.from(value, escapeCharacter).join('') + '"';
}

/** A POSIX shell single-quoted word: nothing inside is expanded, a quote becomes '\'' . */
export function shellSingleQuoted(value: string): string {
  return "'" + value.replace(/'/g, "'\\''") + "'";
}

/** Writes `{{` and `}}` apart, so a template engine (Prometheus, Loki, Datadog) cannot run the text. */
export function neutralizeTemplates(value: string): string {
  return value.replace(/\{(?=\{)/g, '{ ').replace(/\}(?=\})/g, '} ');
}

/** Datadog notifies whoever an @handle names, so the text must never contain one. */
export function neutralizeMentions(value: string): string {
  return value.replace(/@/g, '(at)');
}
