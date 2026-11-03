import { useMemo } from 'react';

import { WORKBENCH_EXPLORER_TEXT } from '../../../content/workbenchExplorer';
import { useText } from '../../../i18n/useText';
import { formatFileSize } from '../../../lib/fileSize';
import { useWorkbench } from '../../core/useWorkbench';
import { utf8ByteLength } from './textSize';

/** What is loaded: name, size and line count, announced politely when it changes. */
export function LoadedSummary() {
  const text = useText(WORKBENCH_EXPLORER_TEXT).loader;
  const { rawLog, fileName, lines, parsing } = useWorkbench();
  const size = useMemo(() => utf8ByteLength(rawLog), [rawLog]);

  return (
    <p className="wbx-summary" aria-live="polite">
      {rawLog === '' ? (
        <span className="wbx-summary-empty">{text.empty}</span>
      ) : (
        <>
          <span className="wbx-summary-name" title={fileName ?? text.pastedName}>
            {fileName ?? text.pastedName}
          </span>
          <span className="wbx-summary-facts">
            {formatFileSize(size)} · {parsing ? text.parsing : text.lineCount(lines.length)}
          </span>
        </>
      )}
    </p>
  );
}
