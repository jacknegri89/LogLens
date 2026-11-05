import '../../styles/workbench-explorer.css';

import { useState } from 'react';

import { WORKBENCH_EXPLORER_TEXT } from '../../content/workbenchExplorer';
import { useText } from '../../i18n/useText';
import { useWorkbench } from '../core/useWorkbench';
import { LineList } from './list/LineList';
import { QueryBar } from './QueryBar';
import { TimeModeSwitch } from './TimeModeSwitch';
import { useExplorerFilter } from './useExplorerFilter';

/** The Explorer: search, filter and read the loaded log line by line. */
export function ExplorerPanel() {
  const { lines, parsing } = useWorkbench();
  const [queryText, setQueryText] = useState('');
  const [focusFaults, setFocusFaults] = useState(false);
  const filter = useExplorerFilter(lines, queryText, focusFaults);

  if (lines.length === 0) {
    if (parsing) {
      return <ExplorerNotice kind="parsing" />;
    }
    return <ExplorerNotice kind="empty" />;
  }
  return (
    <div className="wbx-explorer">
      <div className="wbx-toolbar">
        <QueryBar
          value={queryText}
          onChange={setQueryText}
          focusFaults={focusFaults}
          onFocusFaultsChange={setFocusFaults}
          shown={filter.rows.length}
          total={lines.length}
          unreadParts={filter.query.unreadParts}
        />
        <TimeModeSwitch />
      </div>
      {parsing && <ExplorerNotice kind="parsing" />}
      {filter.rows.length === 0 && <ExplorerNotice kind="noMatches" />}
      {filter.rows.length > 0 && (
        <LineList lines={lines} rows={filter.rows} highlights={filter.highlights} />
      )}
    </div>
  );
}

function ExplorerNotice({ kind }: { kind: 'empty' | 'noMatches' | 'parsing' }) {
  const text = useText(WORKBENCH_EXPLORER_TEXT).explorer;
  if (kind === 'parsing') {
    return (
      <p role="status" className="wbx-parsing">
        {text.parsing}
      </p>
    );
  }
  const empty = kind === 'empty';
  let title = text.noMatchesTitle;
  let body = text.noMatchesBody;
  if (empty) {
    title = text.emptyTitle;
    body = text.emptyBody;
  }
  return (
    <div className="wbx-notice">
      <p className="wbx-notice-title">{title}</p>
      <p className="wbx-notice-body">{body}</p>
    </div>
  );
}
