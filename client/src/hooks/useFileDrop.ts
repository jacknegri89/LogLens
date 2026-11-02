import { useState, type DragEvent } from 'react';

/** Tracks a file being dragged over the editor, and hands over the file that is dropped. */
export function useFileDrop(onFileDrop: (file: File) => void) {
  const [dragging, setDragging] = useState(false);

  const dropZone = {
    onDragOver: (event: DragEvent<HTMLElement>) => {
      event.preventDefault();
      setDragging(true);
    },
    onDragLeave: () => setDragging(false),
    onDrop: (event: DragEvent<HTMLElement>) => {
      event.preventDefault();
      setDragging(false);
      const file = event.dataTransfer.files?.[0];
      if (file) onFileDrop(file);
    },
  };

  return { dragging, dropZone };
}
