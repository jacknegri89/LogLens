import type { KeyboardEvent } from 'react';

import '../../styles/workbench-fix.css';
import { nextTabIndex } from './tabKeys';

export interface SectionTab<Id extends string> {
  id: Id;
  label: string;
}

interface SectionTabsProps<Id extends string> {
  label: string;
  idPrefix: string;
  tabs: SectionTab<Id>[];
  active: Id;
  onChange: (id: Id) => void;
}

const tabElementId = (prefix: string, id: string) => `${prefix}-tab-${id}`;
const panelElementId = (prefix: string, id: string) => `${prefix}-panel-${id}`;

/** A tab list with the arrow, Home and End keys; only the active tab is in the tab order. */
export function SectionTabs<Id extends string>(props: SectionTabsProps<Id>) {
  const { label, idPrefix, tabs, active, onChange } = props;

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const next = nextTabIndex(event.key, index, tabs.length);
    if (next === null) {
      return;
    }
    event.preventDefault();
    onChange(tabs[next].id);
    document.getElementById(tabElementId(idPrefix, tabs[next].id))?.focus();
  }

  return (
    <div role="tablist" aria-label={label} className="fix-tabs">
      {tabs.map((tab, index) => {
        let tabIndex = -1;
        if (tab.id === active) {
          tabIndex = 0;
        }
        return <button
          key={tab.id}
          id={tabElementId(idPrefix, tab.id)}
          type="button"
          role="tab"
          aria-selected={tab.id === active}
          aria-controls={panelElementId(idPrefix, tab.id)}
          tabIndex={tabIndex}
          onClick={() => onChange(tab.id)}
          onKeyDown={(event) => onKeyDown(event, index)}
          className="fix-tab"
        >
          {tab.label}
        </button>;
      })}
    </div>
  );
}
