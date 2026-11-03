import { CopyButton } from '../../components/CopyButton';
import { EXPORT_TEXT } from '../../content/workbenchExport';
import { useText } from '../../i18n/useText';
import { downloadTextFile } from './downloadTextFile';
import type { ExportDocument } from './formats/exportTypes';

const PREVIEW_CHARACTERS = 20_000;

/** One document with its preview, a Copy button and a Download button. */
export function DocumentPreview({ document }: { document: ExportDocument }) {
  const text = useText(EXPORT_TEXT);
  const truncated = document.content.length > PREVIEW_CHARACTERS;

  return (
    <figure className="exp-document">
      <figcaption className="exp-document-head">
        <span className="exp-document-name">
          {text.documents[document.id]} <span className="exp-file">{document.filename}</span>
        </span>
        <span className="exp-actions">
          <CopyButton
            text={document.content}
            label={text.copy}
            copiedLabel={text.copied}
            className="exp-button"
          />
          <button
            type="button"
            onClick={() => downloadTextFile(document.filename, document.content, document.mimeType)}
            className="exp-button"
          >
            {text.download}
          </button>
        </span>
      </figcaption>
      <pre className="exp-code" tabIndex={0} aria-label={text.preview}>
        {truncated ? `${document.content.slice(0, PREVIEW_CHARACTERS)}\n…` : document.content}
      </pre>
      {truncated && <p className="exp-note">{text.previewTruncated}</p>}
    </figure>
  );
}
