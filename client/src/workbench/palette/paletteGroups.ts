export const PALETTE_GROUP_ORDER = ['navigate', 'views', 'log', 'presets', 'settings'] as const;

export type PaletteGroupId = (typeof PALETTE_GROUP_ORDER)[number];

export interface PaletteCommand {
  id: string;
  group: PaletteGroupId;
  label: string;
  /** Extra words that find the command but are not shown. */
  keywords: string;
  run: () => void;
}

export interface PaletteGroup {
  group: PaletteGroupId;
  items: PaletteCommand[];
}

/** Commands under their group, groups in a fixed order; a group with no command is left out. */
export function groupCommands(commands: readonly PaletteCommand[]): PaletteGroup[] {
  return PALETTE_GROUP_ORDER.map((group) => ({
    group,
    items: commands.filter((command) => command.group === group),
  })).filter((entry) => entry.items.length > 0);
}
