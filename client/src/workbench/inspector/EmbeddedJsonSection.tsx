import { useMemo } from 'react';

import { CopyButton } from '../../components/CopyButton';
import { INSPECTOR_TEXT } from '../../content/workbenchInspect';
import { useText } from '../../i18n/useText';
import { findJsonSegments, prettyPrint } from './embeddedJson';
import { JsonTree } from './JsonTree';

const MAX_SEGMENTS = 5;
const COPY_CLASS = 'btn-paper px-3 py-1 text-xs font-bold tracking-wide uppercase';

/** The JSON objects and arrays written in the line, each as a collapsible tree with a copy button. */
export function EmbeddedJsonSection({ raw }: { raw: string }) {
  const text = useText(INSPECTOR_TEXT);
  const segments = useMemo(() => findJsonSegments(raw).slice(0, MAX_SEGMENTS), [raw]);
  if (segments.length === 0) return null;
  return (
    <section aria-labelledby="inspector-json-title">
      <h3 id="inspector-json-title" className="inspect-heading">
        {text.jsonTitle}
      </h3>
      {segments.map((segment, position) => (
        <div key={segment.start} className="inspect-panel">
          <div className="inspect-panel-head">
            <h4 className="inspect-subtitle">{text.jsonItem(position + 1)}</h4>
            <CopyButton
              text={prettyPrint(segment.value)}
              label={text.copyJson}
              copiedLabel={text.copied}
              className={COPY_CLASS}
            />
          </div>
          <JsonTree value={segment.value} />
        </div>
      ))}
    </section>
  );
}
