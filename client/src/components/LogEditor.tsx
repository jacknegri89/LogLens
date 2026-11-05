import { ANALYZE_TEXT } from '../content/analyze';
import { useText } from '../i18n/useText';
import { useEditorReveal } from '../hooks/useEditorReveal';
import { useFileDrop } from '../hooks/useFileDrop';
import { countLines } from '../lib/format';
import { DropOverlay } from './DropOverlay';
import { EditorBody } from './EditorBody';
import { EditorHeader } from './EditorHeader';
import { EditorToolbar } from './EditorToolbar';

export interface LogEditorProps {
  text: string;
  fileName: string | null;
  fileError: 'tooLarge' | 'tooLong' | 'readFailed' | null;
  failingLines: Set<number>;
  canSubmit: boolean;
  loading: boolean;
  onTextChange: (text: string) => void;
  onPickExample: (content: string) => void;
  onFileLoad: (file: File) => void;
  onSubmit: () => void;
  onCancel: () => void;
  onClear: () => void;
  anonymize: boolean;
  onAnonymizeChange: (enabled: boolean) => void;
  anonymizedCounts: Record<string, number> | null;
}

/**
 * The left half of the Analyze page: the log on green bar paper, clipped to the desk
 * under the lamp. Drop a file here too.
 */
export function LogEditor(props: LogEditorProps) {
  const text = useText(ANALYZE_TEXT);
  const reveal = useEditorReveal(props.onFileLoad, props.onPickExample);
  const { dragging, dropZone } = useFileDrop(reveal.loadFile);

  return (
    <section
      id="case-file"
      aria-label={text.exhibitLog}
      className="evidence-sheet editor-sheet flex min-w-0 scroll-mt-8 flex-col"
      {...dropZone}
    >
      <span className="sheet-clip" aria-hidden="true" />
      <EditorHeader
        fileName={props.fileName}
        fileSize={reveal.fileSize}
        lineCount={countLines(props.text)}
        onPickExample={reveal.pickExample}
      />
      <EditorBody
        text={props.text}
        failingLines={props.failingLines}
        scanning={props.loading}
        revealKey={reveal.revealKey}
        onTextChange={props.onTextChange}
        onSubmitShortcut={props.onSubmit}
      />
      {/* The toolbar takes the same props; only the file loader is wrapped for the reveal. */}
      <EditorToolbar {...props} canClear={props.text !== ''} onFileLoad={reveal.loadFile} />
      {props.fileError && (
        <p role="alert" className="px-5 py-2">
          {text.fileErrors[props.fileError]}
        </p>
      )}
      {dragging && <DropOverlay />}
    </section>
  );
}
