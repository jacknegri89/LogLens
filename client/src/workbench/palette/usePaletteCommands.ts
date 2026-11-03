import { WORKBENCH_TEXT } from '../../content/workbench';
import { PALETTE_TEXT } from '../../content/workbenchPalette';
import { useText } from '../../i18n/useText';
import { usePresets } from '../explorer/usePresets';
import {
  logCommands,
  navigationCommands,
  presetCommands,
  settingsCommands,
  viewCommands,
} from './paletteCommandBuilders';
import type { PaletteCommand } from './paletteGroups';
import { usePaletteActions } from './usePaletteActions';

/** Every command the palette offers right now; commands that cannot apply (no log, no presets) are left out. */
export function usePaletteCommands(): PaletteCommand[] {
  const text = useText(PALETTE_TEXT);
  const tabNames = useText(WORKBENCH_TEXT).tabs;
  const actions = usePaletteActions();
  const presets = usePresets();

  return [
    ...navigationCommands(text, actions.go),
    ...viewCommands(text, tabNames, actions.openView),
    ...logCommands(text, actions.log),
    ...presetCommands(text, presets, actions.loadPreset),
    ...settingsCommands(text, actions.settings),
  ];
}
