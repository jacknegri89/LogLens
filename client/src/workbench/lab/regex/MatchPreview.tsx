import { LAB_TEXT } from '../../../content/workbenchLab';
import { useText } from '../../../i18n/useText';
import type { LinePreview } from './regexScan';
import { splitSegments } from './segments';

interface MatchPreviewProps {
  previews: LinePreview[];
  matchedLineCount: number;
}

/** The matching lines. Log text is drawn as plain text pieces: it is never read as HTML. */
export function MatchPreview({ previews, matchedLineCount }: MatchPreviewProps) {
  const text = useText(LAB_TEXT).regex;
  return (
    <section className="lab-card" aria-labelledby="lab-preview-heading">
      <h3 id="lab-preview-heading" className="lab-label">
        {text.previewHeading(previews.length, matchedLineCount)}
      </h3>
      <ol className="lab-lines" aria-label={text.previewLabel}>
        {previews.map((preview) => (
          <PreviewLine key={preview.lineIndex} preview={preview} />
        ))}
      </ol>
    </section>
  );
}

function PreviewLine({ preview }: { preview: LinePreview }) {
  const text = useText(LAB_TEXT).regex;
  return (
    <li className="lab-line">
      <span className="lab-line-number" aria-label={text.lineNumber(preview.lineIndex + 1)}>
        {preview.lineIndex + 1}
      </span>
      <span className="lab-line-text">
        {splitSegments(preview.raw, preview.ranges).map((segment, index) => {
          if (segment.matched) {
            return (
              <mark key={index} className="lab-mark">
                {segment.text}
              </mark>
            );
          }
          return <span key={index}>{segment.text}</span>;
        })}
      </span>
    </li>
  );
}
