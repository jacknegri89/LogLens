import { useRef } from 'react';

import { WORKBENCH_EXPLORER_TEXT } from '../../../content/workbenchExplorer';
import { useText } from '../../../i18n/useText';
import { useWorkbench } from '../../core/useWorkbench';
import { usePresets, type WorkbenchPreset } from '../usePresets';
import { useDetailsDismiss } from './useDetailsDismiss';

/** A native disclosure that opens the ready-made incident logs over the loader. */
export function PresetMenu({ onLoaded }: { onLoaded: () => void }) {
  const text = useText(WORKBENCH_EXPLORER_TEXT).loader;
  const presets = usePresets();
  const { setLog } = useWorkbench();
  const detailsRef = useRef<HTMLDetailsElement>(null);
  useDetailsDismiss(detailsRef);

  const choose = (preset: WorkbenchPreset) => {
    setLog(preset.log, `${preset.id}.log`);
    onLoaded();
    if (detailsRef.current) detailsRef.current.open = false;
  };

  return (
    <details ref={detailsRef} className="wbx-presets">
      <summary className="wbx-button">{text.presets}</summary>
      <ul className="wbx-preset-list" aria-label={text.presetsLabel}>
        {presets.map((preset) => (
          <li key={preset.id}>
            <button type="button" className="wbx-preset" onClick={() => choose(preset)}>
              <span className="wbx-preset-title">{preset.title}</span>
              <span className="wbx-preset-description">{preset.description}</span>
            </button>
          </li>
        ))}
      </ul>
    </details>
  );
}
