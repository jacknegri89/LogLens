import { useId, useState } from 'react';

import { PALETTE_TEXT } from '../../content/workbenchPalette';
import { useText } from '../../i18n/useText';
import { rankByQuery } from './fuzzy';
import { groupCommands } from './paletteGroups';
import { PaletteInput } from './PaletteInput';
import { PaletteResults } from './PaletteResults';
import { usePaletteCommands } from './usePaletteCommands';
import { usePaletteSelection } from './usePaletteSelection';

/** Search box, filtered command list and key hint. Running a command closes the palette first. */
export function PaletteBody({ onClose }: { onClose: () => void }) {
  const text = useText(PALETTE_TEXT);
  const listId = useId();
  const [query, setQuery] = useState('');
  const groups = groupCommands(rankByQuery(usePaletteCommands(), query));
  const flat = groups.flatMap((entry) => entry.items);
  const selection = usePaletteSelection(flat.length);
  const activeCommand = flat[selection.active];
  let activeId: string | undefined;
  if (activeCommand) {
    activeId = `${listId}-${activeCommand.id}`;
  }

  function run(index: number) {
    const command = flat[index];
    onClose();
    command?.run();
  }
  function changeQuery(value: string) {
    setQuery(value);
    selection.first();
  }

  return (
    <>
      <PaletteInput
        query={query}
        onQueryChange={changeQuery}
        listId={listId}
        activeId={activeId}
        selection={selection}
        onRun={() => run(selection.active)}
      />
      <PaletteResults
        listId={listId}
        groups={groups}
        flat={flat}
        active={selection.active}
        onHover={selection.moveTo}
        onRun={run}
      />
      <p className="pal-hint">{text.hint}</p>
    </>
  );
}
