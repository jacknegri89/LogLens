/** Replaces each `{name}` with its value; a name without a value is left as written. */
export function fillTemplate(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (placeholder, name: string) => {
    if (Object.prototype.hasOwnProperty.call(values, name)) {
      return String(values[name]);
    }
    return placeholder;
  });
}
