import { useEffect, useRef, type KeyboardEvent } from 'react';

import { PALETTE_TEXT } from '../../content/workbenchPalette';
import { useText } from '../../i18n/useText';
import type { usePaletteSelection } from './usePaletteSelection';

interface PaletteInputProps {
  query: string;
  onQueryChange: (query: string) => void;
  listId: string;
  activeId: string | undefined;
  selection: ReturnType<typeof usePaletteSelection>;
  onRun: () => void;
}

/** The search box of the palette, wired as the combobox of the result list. */
export function PaletteInput({
  query,
  onQueryChange,
  listId,
  activeId,
  selection,
  onRun,
}: PaletteInputProps) {
  const text = useText(PALETTE_TEXT);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => inputRef.current?.focus(), []);

  function onKeyDown(event: KeyboardEvent) {
    const actions: Record<string, () => void> = {
      ArrowDown: () => selection.move(1),
      ArrowUp: () => selection.move(-1),
      Home: selection.first,
      End: selection.last,
      Enter: onRun,
    };
    const action = actions[event.key];
    if (!action) return;
    event.preventDefault();
    action();
  }

  return (
    <input
      ref={inputRef}
      type="text"
      role="combobox"
      aria-expanded="true"
      aria-controls={listId}
      aria-activedescendant={activeId}
      aria-autocomplete="list"
      aria-label={text.inputLabel}
      placeholder={text.placeholder}
      autoComplete="off"
      spellCheck={false}
      value={query}
      onChange={(event) => onQueryChange(event.target.value)}
      onKeyDown={onKeyDown}
      className="pal-input"
    />
  );
}
