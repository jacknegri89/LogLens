import { useRef } from 'react';

import { LAB_TEXT } from '../../../content/workbenchLab';
import { useText } from '../../../i18n/useText';
import { MAX_MAP_FILE_MEGABYTES, type LoadedMap, type MapFileProblem } from './useSourceMapLab';

interface MapInputProps {
  draft: string;
  loaded: LoadedMap | null;
  fileProblem: MapFileProblem | null;
  onDraft: (value: string) => void;
  onLoadDraft: () => void;
  onFile: (file: File) => void;
}

export function MapInput(props: MapInputProps) {
  const text = useText(LAB_TEXT).sourceMaps;
  return (
    <section className="lab-card" aria-labelledby="lab-map-heading">
      <h3 id="lab-map-heading" className="lab-label">
        {text.mapHeading}
      </h3>
      <textarea
        value={props.draft}
        onChange={(event) => props.onDraft(event.target.value)}
        aria-label={text.mapPasteLabel}
        placeholder={text.mapPlaceholder}
        spellCheck={false}
        rows={5}
        className="lab-input lab-textarea"
      />
      <MapActions {...props} />
      <MapStatus loaded={props.loaded} fileProblem={props.fileProblem} />
    </section>
  );
}

function MapActions({ draft, onLoadDraft, onFile }: MapInputProps) {
  const text = useText(LAB_TEXT).sourceMaps;
  const fileInput = useRef<HTMLInputElement>(null);

  return (
    <div className="lab-actions">
      <button
        type="button"
        className="lab-button"
        disabled={draft.trim() === ''}
        onClick={onLoadDraft}
      >
        {text.loadMap}
      </button>
      <button type="button" className="lab-button" onClick={() => fileInput.current?.click()}>
        {text.openMap}
      </button>
      <input
        ref={fileInput}
        type="file"
        accept=".map,.json,application/json"
        aria-label={text.openMap}
        className="lab-file-input"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) {
            onFile(file);
          }
        }}
      />
    </div>
  );
}

function MapStatus({ loaded, fileProblem }: Pick<MapInputProps, 'loaded' | 'fileProblem'>) {
  const text = useText(LAB_TEXT).sourceMaps;
  if (fileProblem) {
    let message = text.mapUnreadable;
    if (fileProblem === 'tooBig') {
      message = text.mapTooBig(MAX_MAP_FILE_MEGABYTES);
    }
    return (
      <p role="alert" className="lab-problem">
        {message}
      </p>
    );
  }
  if (!loaded) {
    return null;
  }
  if (!loaded.parsed.ok) {
    return (
      <p role="alert" className="lab-problem">
        {text.mapProblems[loaded.parsed.problem]}
      </p>
    );
  }
  const sourceCount = loaded.parsed.map.sections.reduce(
    (total, section) => total + section.map.sources.length,
    0,
  );
  return (
    <p role="status" className="lab-count">
      {text.mapLoaded(loaded.name ?? text.mapPasted, sourceCount)}
    </p>
  );
}
