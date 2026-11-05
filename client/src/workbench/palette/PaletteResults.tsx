import { useEffect } from 'react';

import { PALETTE_TEXT } from '../../content/workbenchPalette';
import { useText } from '../../i18n/useText';
import type { PaletteCommand, PaletteGroup } from './paletteGroups';

interface PaletteResultsProps {
  listId: string;
  groups: PaletteGroup[];
  flat: PaletteCommand[];
  active: number;
  onHover: (index: number) => void;
  onRun: (index: number) => void;
}

/** The commands as a listbox of groups; the count is announced to screen readers as it changes. */
export function PaletteResults({
  listId,
  groups,
  flat,
  active,
  onHover,
  onRun,
}: PaletteResultsProps) {
  const text = useText(PALETTE_TEXT);
  let activeId: string | null = null;
  if (active >= 0) {
    activeId = `${listId}-${flat[active].id}`;
  }
  let resultMessage = text.noResults;
  if (flat.length !== 0) {
    resultMessage = text.results(flat.length);
  }
  useEffect(() => {
    if (activeId) {
      document.getElementById(activeId)?.scrollIntoView({ block: 'nearest' });
    }
  }, [activeId]);

  return (
    <>
      <div id={listId} role="listbox" aria-label={text.listLabel} className="pal-list">
        {groups.map((entry) => (
          <div key={entry.group} role="group" aria-label={text.groups[entry.group]}>
            <p className="pal-group" aria-hidden="true">
              {text.groups[entry.group]}
            </p>
            {entry.items.map((command) => {
              const index = flat.indexOf(command);
              return (
                <div
                  key={command.id}
                  id={`${listId}-${command.id}`}
                  role="option"
                  aria-selected={index === active}
                  onMouseMove={() => index !== active && onHover(index)}
                  onClick={() => onRun(index)}
                  className="pal-option"
                >
                  {command.label}
                </div>
              );
            })}
          </div>
        ))}
        {flat.length === 0 && <p className="pal-empty">{text.noResults}</p>}
      </div>
      <p role="status" className="sr-only">
        {resultMessage}
      </p>
    </>
  );
}
