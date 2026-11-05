/** The singular and the plural of a unit, such as ['line', 'lines']. */
export type UnitForms = readonly [singular: string, plural: string];

/** "1 line", "3 lines": the unit agrees with the count. Zero takes the plural, as in English and Italian. */
export function withCount(count: number, [singular, plural]: UnitForms): string {
  if (count === 1) {
    return `${count} ${singular}`;
  }
  return `${count} ${plural}`;
}
