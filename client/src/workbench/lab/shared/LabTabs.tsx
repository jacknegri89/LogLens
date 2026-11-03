import { useRef, type KeyboardEvent } from 'react';

import { labPanelId, labTabId } from './labTabIds';
import { nextTabIndex } from './tabKeys';

export interface LabTabItem<Id extends string> {
  id: Id;
  label: string;
}

interface LabTabsProps<Id extends string> {
  label: string;
  tabs: ReadonlyArray<LabTabItem<Id>>;
  active: Id;
  onChange: (id: Id) => void;
}

interface TabButtonProps {
  id: string;
  label: string;
  selected: boolean;
  onSelect: () => void;
  onKeyDown: (event: KeyboardEvent) => void;
  buttonRef: (element: HTMLButtonElement | null) => void;
}

function TabButton({ id, label, selected, onSelect, onKeyDown, buttonRef }: TabButtonProps) {
  return (
    <button
      ref={buttonRef}
      id={labTabId(id)}
      type="button"
      role="tab"
      aria-selected={selected}
      aria-controls={labPanelId(id)}
      tabIndex={selected ? 0 : -1}
      onClick={onSelect}
      onKeyDown={onKeyDown}
      className="lab-tab"
    >
      {label}
    </button>
  );
}

/** An accessible tab list: arrow keys, Home and End move between tabs, and only the active tab takes Tab. */
export function LabTabs<Id extends string>({ label, tabs, active, onChange }: LabTabsProps<Id>) {
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);

  function moveWithKey(event: KeyboardEvent, index: number) {
    const next = nextTabIndex(index, event.key, tabs.length);
    if (next === null) return;
    event.preventDefault();
    onChange(tabs[next].id);
    buttons.current[next]?.focus();
  }

  return (
    <div role="tablist" aria-label={label} className="lab-tabs">
      {tabs.map((tab, index) => (
        <TabButton
          key={tab.id}
          id={tab.id}
          label={tab.label}
          selected={tab.id === active}
          onSelect={() => onChange(tab.id)}
          onKeyDown={(event) => moveWithKey(event, index)}
          buttonRef={(element) => {
            buttons.current[index] = element;
          }}
        />
      ))}
    </div>
  );
}
