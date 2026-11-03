import { LAB_TEXT } from '../../../content/workbenchLab';
import { useText } from '../../../i18n/useText';
import { MatchPreview } from './MatchPreview';
import { PatternControls } from './PatternControls';
import { DEFAULT_SCAN_OPTIONS, type ScanSnapshot } from './regexScan';
import { useRegexLab } from './useRegexLab';
import { ValueList } from './ValueList';

export function RegexLab() {
  const lab = useRegexLab();
  const text = useText(LAB_TEXT).regex;

  return (
    <div className="lab-stack">
      <p className="lab-intro">{text.intro}</p>
      <PatternControls
        pattern={lab.pattern}
        flags={lab.flags}
        extractorId={lab.extractorId}
        onPattern={lab.typePattern}
        onFlag={lab.toggleFlag}
        onExtractor={lab.toggleExtractor}
      />
      {lab.lines.length === 0 ? (
        <p className="lab-empty">{text.noLog}</p>
      ) : (
        <RegexStatus build={lab.build} snapshot={lab.snapshot} />
      )}
      {lab.snapshot && lab.snapshot.matchedLineCount > 0 && (
        <div className="lab-columns">
          <MatchPreview
            previews={lab.snapshot.previews}
            matchedLineCount={lab.snapshot.matchedLineCount}
          />
          <ValueList snapshot={lab.snapshot} extractorId={lab.extractorId} />
        </div>
      )}
    </div>
  );
}

interface RegexStatusProps {
  build: ReturnType<typeof useRegexLab>['build'];
  snapshot: ScanSnapshot | null;
}

/** One line under the controls: the problem with the pattern, or how the search is going. */
function RegexStatus({ build, snapshot }: RegexStatusProps) {
  const text = useText(LAB_TEXT).regex;
  if (build.status === 'invalid') {
    return (
      <p role="alert" className="lab-problem">
        {text.invalid(build.message)}
      </p>
    );
  }
  if (build.status === 'risky') {
    return (
      <p role="alert" className="lab-problem">
        {text.risky}
      </p>
    );
  }
  if (build.status === 'empty' || !snapshot) return null;
  return <ScanStatus snapshot={snapshot} />;
}

function ScanStatus({ snapshot }: { snapshot: ScanSnapshot }) {
  const text = useText(LAB_TEXT).regex;
  return (
    <div role="status" className="lab-status">
      <p className="lab-count">{text.summary(snapshot.matchCount, snapshot.matchedLineCount)}</p>
      {!snapshot.done && (
        <p className="lab-note">{text.scanning(snapshot.scannedLines, snapshot.totalLines)}</p>
      )}
      {snapshot.stoppedEarly && (
        <p className="lab-warning">{text.stoppedEarly(DEFAULT_SCAN_OPTIONS.maxMatches)}</p>
      )}
      {snapshot.done && snapshot.matchCount === 0 && <p className="lab-note">{text.noMatches}</p>}
    </div>
  );
}
