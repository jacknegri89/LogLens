import '../../styles/workbench-explorer.css';

import { WORKBENCH_EXPLORER_TEXT } from '../../content/workbenchExplorer';
import { useFileDrop } from '../../hooks/useFileDrop';
import { useText } from '../../i18n/useText';
import { useWorkbench } from '../core/useWorkbench';
import { DropZone } from './loader/DropZone';
import { LoadedSummary } from './loader/LoadedSummary';
import { PasteArea } from './loader/PasteArea';
import { PresetMenu } from './loader/PresetMenu';
import { useLogFileLoader, type LogFileLoader } from './loader/useLogFileLoader';

/** The intake above the tabs: paste, drop or pick a file, or open a ready-made incident. */
export function LogLoader() {
  const text = useText(WORKBENCH_EXPLORER_TEXT).loader;
  const files = useLogFileLoader();
  const { dragging, dropZone } = useFileDrop(files.loadFile);

  return (
    <section
      className="wbx-loader"
      aria-labelledby="wbx-loader-heading"
      data-dragging={dragging || undefined}
      {...dropZone}
    >
      <LoaderHeader files={files} />
      <div className="wbx-loader-body">
        <PasteArea onLoaded={files.reset} />
        <DropZone onFile={files.loadFile} reading={files.reading} dragging={dragging} />
      </div>
      {files.error && (
        <p role="alert" className="wbx-alert">
          {text.errors[files.error]}
        </p>
      )}
    </section>
  );
}

function LoaderHeader({ files }: { files: LogFileLoader }) {
  const text = useText(WORKBENCH_EXPLORER_TEXT).loader;
  const { rawLog, setLog } = useWorkbench();

  return (
    <div className="wbx-loader-head">
      <h2 id="wbx-loader-heading" className="wbx-eyebrow">
        {text.heading}
      </h2>
      <LoadedSummary />
      <div className="wbx-loader-actions">
        <PresetMenu onLoaded={files.reset} />
        <button
          type="button"
          className="wbx-button"
          disabled={rawLog === '' && !files.error}
          onClick={() => {
            setLog('');
            files.reset();
          }}
        >
          {text.clear}
        </button>
      </div>
    </div>
  );
}
