import { EXPORT_TEXT } from '../../content/workbenchExport';
import { useText } from '../../i18n/useText';
import { EXPORT_FORMAT_IDS, type ExportFormatId } from './formats/exportTypes';

interface FormatPickerProps {
  format: ExportFormatId;
  onChange: (format: ExportFormatId) => void;
}

/** The four formats as toggle buttons; the pressed one is previewed below. */
export function FormatPicker({ format, onChange }: FormatPickerProps) {
  const text = useText(EXPORT_TEXT);

  return (
    <div role="group" aria-label={text.formatsLabel} className="exp-formats">
      {EXPORT_FORMAT_IDS.map((id) => (
        <button
          key={id}
          type="button"
          aria-pressed={id === format}
          onClick={() => onChange(id)}
          className="exp-format"
        >
          <span className="exp-format-name">{text.formats[id].name}</span>
          <span className="exp-format-hint">{text.formats[id].hint}</span>
        </button>
      ))}
    </div>
  );
}
