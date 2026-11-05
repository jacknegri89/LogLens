import { useRef, type KeyboardEvent } from 'react';

import { PALETTE_TEXT } from '../../content/workbenchPalette';
import { useText } from '../../i18n/useText';
import { PaletteBody } from './PaletteBody';
import { useFocusTrap } from './useFocusTrap';
import { useLockPageScroll } from './useLockPageScroll';

/** The palette window: a modal dialog that traps focus and closes on Esc or a click outside. */
export function PaletteDialog({ onClose }: { onClose: () => void }) {
  const text = useText(PALETTE_TEXT);
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef);
  useLockPageScroll();

  function onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      onClose();
    }
  }

  return (
    <div
      className="pal-backdrop"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={text.title}
        className="pal-dialog"
        onKeyDown={onKeyDown}
      >
        <PaletteBody onClose={onClose} />
      </div>
    </div>
  );
}
