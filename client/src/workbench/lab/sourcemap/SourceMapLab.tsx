import { LAB_TEXT } from '../../../content/workbenchLab';
import { useText } from '../../../i18n/useText';
import { FrameList } from './FrameList';
import { MapInput } from './MapInput';
import { useSourceMapLab } from './useSourceMapLab';

export function SourceMapLab() {
  const text = useText(LAB_TEXT).sourceMaps;
  const lab = useSourceMapLab();
  const mapReady = lab.loaded?.parsed.ok === true;

  return (
    <div className="lab-stack">
      <p className="lab-intro">{text.intro}</p>
      <MapInput
        draft={lab.draft}
        loaded={lab.loaded}
        fileProblem={lab.fileProblem}
        onDraft={lab.setDraft}
        onLoadDraft={lab.loadDraft}
        onFile={(file) => void lab.openFile(file)}
      />
      <section className="lab-card" aria-labelledby="lab-trace-heading">
        <h3 id="lab-trace-heading" className="lab-label">
          {text.traceHeading}
        </h3>
        <textarea
          value={lab.trace}
          onChange={(event) => lab.setTrace(event.target.value)}
          aria-label={text.traceLabel}
          placeholder={text.tracePlaceholder}
          spellCheck={false}
          rows={6}
          className="lab-input lab-textarea"
        />
      </section>
      <TraceOutcome frames={lab.frames} mapReady={mapReady} traceEmpty={lab.trace.trim() === ''} />
    </div>
  );
}

interface TraceOutcomeProps {
  frames: ReturnType<typeof useSourceMapLab>['frames'];
  mapReady: boolean;
  traceEmpty: boolean;
}

function TraceOutcome({ frames, mapReady, traceEmpty }: TraceOutcomeProps) {
  const text = useText(LAB_TEXT).sourceMaps;
  if (!mapReady) return <p className="lab-empty">{text.needMap}</p>;
  if (traceEmpty || !frames) return <p className="lab-empty">{text.needTrace}</p>;
  if (frames.length === 0) return <p className="lab-warning">{text.noFrames}</p>;
  return <FrameList frames={frames} />;
}
