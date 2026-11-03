import { describe, expect, it } from 'vitest';

import { groupCommands, type PaletteCommand } from './paletteGroups';

function command(id: string, group: PaletteCommand['group']): PaletteCommand {
  return { id, group, label: id, keywords: '', run: () => undefined };
}

describe('groupCommands', () => {
  it('orders the groups by the fixed order and keeps the command order inside them', () => {
    const groups = groupCommands([
      command('b', 'settings'),
      command('a1', 'navigate'),
      command('c', 'log'),
      command('a2', 'navigate'),
    ]);
    expect(groups.map((entry) => entry.group)).toEqual(['navigate', 'log', 'settings']);
    expect(groups[0].items.map((item) => item.id)).toEqual(['a1', 'a2']);
  });

  it('leaves out groups with no command and returns nothing for no commands', () => {
    expect(groupCommands([command('x', 'presets')]).map((entry) => entry.group)).toEqual([
      'presets',
    ]);
    expect(groupCommands([])).toEqual([]);
  });
});
