import { useMemo, useState } from 'react';

import { CopyButton } from '../../components/CopyButton';
import { INSPECTOR_TEXT } from '../../content/workbenchInspect';
import { useText } from '../../i18n/useText';
import type { ParsedLine } from '../types';
import { BookmarksList } from './BookmarksList';
import { findLineTokens } from './decode/findTokens';
import type { DecodedToken } from './decode/types';
import { DecodedSection } from './DecodedSection';
import { EmbeddedJsonSection } from './EmbeddedJsonSection';
import { FieldsTable } from './FieldsTable';
import { LineFacts } from './LineFacts';
import { RawLineView } from './RawLineView';
import { useCurrentTime } from './useCurrentTime';

interface InspectorBodyProps {
  line: ParsedLine;
  lines: readonly ParsedLine[];
  bookmarks: ReadonlySet<number>;
  onJump: (index: number) => void;
}

interface RawLineSectionProps {
  raw: string;
  tokens: readonly DecodedToken[];
  activeId: string | null;
  onToggle: (tokenId: string) => void;
}

function RawLineSection({ raw, tokens, activeId, onToggle }: RawLineSectionProps) {
  const text = useText(INSPECTOR_TEXT);
  return (
    <section aria-labelledby="inspector-raw-title">
      <h3 id="inspector-raw-title" className="inspect-heading">
        {text.rawLine}
      </h3>
      <RawLineView raw={raw} tokens={tokens} activeId={activeId} onToggle={onToggle} />
      {tokens.length > 0 && <p className="inspect-muted">{text.rawHint}</p>}
      <CopyButton
        text={raw}
        label={text.copyLine}
        copiedLabel={text.copied}
        className="btn-paper mt-2 px-3 py-1 text-xs font-bold tracking-wide uppercase"
      />
    </section>
  );
}

/** Everything below the header. The drawer remounts it for each line, which resets the open token. */
export function InspectorBody({ line, lines, bookmarks, onJump }: InspectorBodyProps) {
  const now = useCurrentTime();
  const tokens = useMemo(() => findLineTokens(line), [line]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const toggle = (id: string) => setActiveId((current) => (current === id ? null : id));

  return (
    <div className="inspect-body">
      <LineFacts line={line} />
      <RawLineSection raw={line.raw} tokens={tokens} activeId={activeId} onToggle={toggle} />
      <DecodedSection tokens={tokens} activeId={activeId} onToggle={toggle} nowMilliseconds={now} />
      <EmbeddedJsonSection raw={line.raw} />
      <FieldsTable fields={line.fields} />
      <BookmarksList
        lines={lines}
        bookmarks={bookmarks}
        currentIndex={line.index}
        onJump={onJump}
      />
    </div>
  );
}
