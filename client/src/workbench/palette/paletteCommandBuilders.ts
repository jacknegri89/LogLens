import type { TextOf } from '../../i18n/defineText';
import type { Language } from '../../i18n/languages';
import { LANGUAGES, LANGUAGE_LABELS } from '../../i18n/languages';
import type { PALETTE_TEXT } from '../../content/workbenchPalette';
import type { WorkbenchTabId } from '../types';
import { WORKBENCH_TAB_IDS } from '../types';
import type { WorkbenchPreset } from '../explorer/usePresets';
import type { PaletteCommand } from './paletteGroups';

export type PaletteTexts = TextOf<typeof PALETTE_TEXT>;

export function navigationCommands(
  text: PaletteTexts,
  go: (path: string) => void,
): PaletteCommand[] {
  const entry = (id: string, path: string, label: string, keywords: string): PaletteCommand => ({
    id,
    group: 'navigate',
    label,
    keywords,
    run: () => go(path),
  });
  return [
    entry('go-analyze', '/', text.commands.goAnalyze, text.keywords.goAnalyze),
    entry('go-workbench', '/workbench', text.commands.goWorkbench, text.keywords.goWorkbench),
    entry('go-history', '/history', text.commands.goHistory, text.keywords.goHistory),
  ];
}

export function viewCommands(
  text: PaletteTexts,
  names: Record<WorkbenchTabId, string>,
  openView: (tab: WorkbenchTabId) => void,
): PaletteCommand[] {
  return WORKBENCH_TAB_IDS.map((tab) => ({
    id: `view-${tab}`,
    group: 'views',
    label: text.commands.openView(names[tab]),
    keywords: tab,
    run: () => openView(tab),
  }));
}

export interface LogActions {
  hasLog: boolean;
  scrub: () => void;
  clear: () => void;
}

export function logCommands(text: PaletteTexts, actions: LogActions): PaletteCommand[] {
  if (!actions.hasLog) {
    return [];
  }
  return [
    {
      id: 'scrub',
      group: 'log',
      label: text.commands.scrub,
      keywords: text.keywords.scrub,
      run: actions.scrub,
    },
    {
      id: 'clear',
      group: 'log',
      label: text.commands.clear,
      keywords: text.keywords.clear,
      run: actions.clear,
    },
  ];
}

export function presetCommands(
  text: PaletteTexts,
  presets: readonly WorkbenchPreset[],
  load: (preset: WorkbenchPreset) => void,
): PaletteCommand[] {
  return presets.map((preset) => ({
    id: `preset-${preset.id}`,
    group: 'presets',
    label: text.commands.loadPreset(preset.title),
    keywords: `${text.keywords.loadPreset} ${preset.description}`,
    run: () => load(preset),
  }));
}

export interface SettingsActions {
  language: Language;
  setLanguage: (language: Language) => void;
  contrastOn: boolean;
  setContrast: (enabled: boolean) => void;
}

export function settingsCommands(text: PaletteTexts, actions: SettingsActions): PaletteCommand[] {
  const switchLanguage: PaletteCommand[] = LANGUAGES.filter(
    (code) => code !== actions.language,
  ).map((code) => ({
    id: `language-${code}`,
    group: 'settings',
    label: text.commands.switchLanguage(LANGUAGE_LABELS[code].name),
    keywords: text.keywords.switchLanguage,
    run: () => actions.setLanguage(code),
  }));
  let contrastLabel = text.commands.enableContrast;
  if (actions.contrastOn) {
    contrastLabel = text.commands.disableContrast;
  }
  const contrast: PaletteCommand = {
    id: 'contrast',
    group: 'settings',
    label: contrastLabel,
    keywords: text.keywords.contrast,
    run: () => actions.setContrast(!actions.contrastOn),
  };
  return [...switchLanguage, contrast];
}
