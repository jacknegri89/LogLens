import { useNavigate } from 'react-router-dom';

import { useLanguage } from '../../i18n/useLanguage';
import { useWorkbench } from '../core/useWorkbench';
import type { WorkbenchPreset } from '../explorer/usePresets';
import { useScrubLog } from '../security/useScrubLog';
import type { WorkbenchTabId } from '../types';
import { isContrastActive, setContrastTheme } from './contrastTheme';
import type { LogActions, SettingsActions } from './paletteCommandBuilders';

export interface PaletteActions {
  go: (path: string) => void;
  openView: (tab: WorkbenchTabId) => void;
  loadPreset: (preset: WorkbenchPreset) => void;
  log: LogActions;
  settings: SettingsActions;
}

/** What each palette command does, wired to the router, the Workbench and the page settings. */
export function usePaletteActions(): PaletteActions {
  const navigate = useNavigate();
  const { rawLog, setLog, setActiveTab } = useWorkbench();
  const { scrub, canScrub } = useScrubLog();
  const { language, setLanguage } = useLanguage();

  const openView = (tab: WorkbenchTabId) => {
    navigate('/workbench');
    setActiveTab(tab);
  };
  return {
    go: (path) => navigate(path),
    openView,
    loadPreset: (preset) => {
      setLog(preset.log);
      openView('explorer');
    },
    log: {
      hasLog: rawLog !== '',
      // The badge that reports the result lives on the Workbench page.
      scrub: () => {
        navigate('/workbench');
        if (canScrub) scrub();
      },
      clear: () => setLog(''),
    },
    settings: {
      language,
      setLanguage,
      contrastOn: isContrastActive(),
      setContrast: setContrastTheme,
    },
  };
}
