import { WORKBENCH_EXPLORER_TEXT } from '../../content/workbenchExplorer';
import { useText } from '../../i18n/useText';
import { PRESET_IDS, PRESET_LOGS } from './presetLogs';

export interface WorkbenchPreset {
  id: string;
  /** Shown in the page language. */
  title: string;
  description: string;
  /** The log itself; it is data and is never translated. */
  log: string;
}

/** The six ready-made incident scenarios, with title and description in the page language. */
export function usePresets(): WorkbenchPreset[] {
  const texts = useText(WORKBENCH_EXPLORER_TEXT).presets;
  return PRESET_IDS.map((id) => ({ id, ...texts[id], log: PRESET_LOGS[id] }));
}
