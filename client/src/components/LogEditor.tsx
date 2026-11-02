import { ANALYZE_TEXT } from '../content/analyze';
import { useFileDrop } from '../hooks/useFileDrop';
import { countLines } from '../lib/format';
import { EditorBody } from './EditorBody';
import { EditorHeader } from './EditorHeader';
import { EditorToolbar } from './EditorToolbar';

export interface LogEditorProps {
  text: string;
  fileName: string | null;
  failingLines: Set<number>;
  canSubmit: boolean;
  loading: boolean;
  onTextChange: (text: string) => void;
  onPickExample: (content: string) => void;
  onFileLoad: (file: File) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

/** The left half of the Analyze page: the log on green bar paper. Drop a file here too. */
export function LogEditor(props: LogEditorProps) {
  const { dragging, dropZone } = useFileDrop(props.onFileLoad);
  const dropClass = dragging ? 'outline-4 outline-marker outline-dashed -outline-offset-8' : '';

  return (
    <section
      className={`relative flex min-w-0 flex-col bg-paper text-ink ${dropClass}`}
      {...dropZone}
    >
      <EditorHeader
        title={props.fileName ?? ANALYZE_TEXT.untitledLog}
        lineCount={countLines(props.text)}
        onPickExample={props.onPickExample}
      />
      <EditorBody
        text={props.text}
        failingLines={props.failingLines}
        onTextChange={props.onTextChange}
        onSubmitShortcut={props.onSubmit}
      />
      <EditorToolbar
        canSubmit={props.canSubmit}
        loading={props.loading}
        onSubmit={props.onSubmit}
        onCancel={props.onCancel}
        onFileLoad={props.onFileLoad}
      />
    </section>
  );
}
