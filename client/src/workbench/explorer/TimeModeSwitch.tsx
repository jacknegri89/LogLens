import { useMemo } from 'react';

import { WORKBENCH_EXPLORER_TEXT } from '../../content/workbenchExplorer';
import { useText } from '../../i18n/useText';
import { localZoneName } from '../core/timeFormat';
import { useWorkbench } from '../core/useWorkbench';
import type { TimeMode } from '../types';

const TIME_MODES: readonly TimeMode[] = ['utc', 'local', 'relative'];

/** UTC, the browser's zone (named) or the gap from the previous timed line. */
export function TimeModeSwitch() {
  const text = useText(WORKBENCH_EXPLORER_TEXT).explorer;
  const { timeMode, setTimeMode } = useWorkbench();
  const zone = useMemo(() => localZoneName(), []);

  return (
    <div className="wbx-segmented" role="group" aria-labelledby="wbx-time-label">
      <span id="wbx-time-label" className="wbx-label">
        {text.timeLabel}
      </span>
      {TIME_MODES.map((mode) => {
        let title: string | undefined;
        if (mode === 'relative') {
          title = text.relativeHint;
        }
        return (
          <button
            key={mode}
            type="button"
            aria-pressed={mode === timeMode}
            title={title}
            onClick={() => setTimeMode(mode)}
          >
            {text.timeModes[mode]}
            {mode === 'local' && zone !== '' && <span className="wbx-zone">{zone}</span>}
          </button>
        );
      })}
    </div>
  );
}
