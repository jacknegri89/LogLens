import { LAB_TEXT } from '../../../content/workbenchLab';
import { useText } from '../../../i18n/useText';
import type { SourceSnippet } from './resolvePosition';
import type { ResolvedFrame } from './resolveTrace';

export function FrameList({ frames }: { frames: ResolvedFrame[] }) {
  const text = useText(LAB_TEXT).sourceMaps;
  const resolvedCount = frames.filter((item) => item.resolution.status === 'resolved').length;

  return (
    <section aria-labelledby="lab-frames-heading" className="lab-stack">
      <h3 id="lab-frames-heading" className="lab-count">
        {text.resultHeading(resolvedCount, frames.length)}
      </h3>
      <ol className="lab-frames">
        {frames.map((item, index) => (
          <FrameCard key={index} item={item} />
        ))}
      </ol>
    </section>
  );
}

function minifiedPlace({ frame }: ResolvedFrame): string {
  let position = '';
  if (frame.line !== null) {
    position = `:${frame.line}:${frame.column}`;
  }
  return `${frame.file}${position}`;
}

function FrameCard({ item }: { item: ResolvedFrame }) {
  const text = useText(LAB_TEXT).sourceMaps;
  const { resolution } = item;
  let className = 'lab-card lab-frame';
  if (resolution.status !== 'resolved') {
    className += ' lab-frame-open';
  }

  return (
    <li className={className}>
      <p className="lab-frame-minified">
        <span className="lab-label">{text.minified}</span>
        <code>
          {item.frame.functionName ?? text.anonymous} {minifiedPlace(item)}
        </code>
      </p>
      {resolution.status === 'resolved' && (
        <div>
          <p className="lab-frame-original">
            <span className="lab-label">{text.original}</span>
            <code>
              {resolution.name ?? item.frame.functionName ?? text.anonymous} {resolution.source}:
              {resolution.line}:{resolution.column}
            </code>
          </p>
          {resolution.snippet && (
            <Snippet snippet={resolution.snippet} label={text.snippetLabel(resolution.source)} />
          )}
        </div>
      )}
      {resolution.status !== 'resolved' && (
        <p className="lab-problem">{text.unresolved[resolution.reason]}</p>
      )}
    </li>
  );
}

function Snippet({ snippet, label }: { snippet: SourceSnippet; label: string }) {
  return (
    <pre className="lab-snippet" aria-label={label}>
      {snippet.lines.map((line, index) => {
        let className = 'lab-snippet-line';
        if (index === snippet.highlightIndex) {
          className += ' lab-snippet-hit';
        }
        return (
          <span key={index} className={className}>
            <span className="lab-snippet-number">{snippet.startLine + index}</span>
            {line}
            {'\n'}
          </span>
        );
      })}
    </pre>
  );
}
