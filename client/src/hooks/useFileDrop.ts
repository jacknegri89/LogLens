import { useState, type DragEvent } from 'react';

type ZoneEvent = DragEvent<HTMLElement>;
type DraggingSetter = (dragging: boolean) => void;
type FileHandler = (file: File) => void;

function carriesFiles(event: ZoneEvent): boolean {
  return Array.from(event.dataTransfer.types).includes('Files');
}

/** Moving onto a child element also fires dragleave: only leaving the zone counts. */
function leftZone(event: ZoneEvent): boolean {
  return !event.currentTarget.contains(event.relatedTarget as Node | null);
}

function createDropZone(setDragging: DraggingSetter, onFileDrop: FileHandler) {
  return {
    onDragOver: (event: ZoneEvent) => {
      if (!carriesFiles(event)) return;
      event.preventDefault();
      setDragging(true);
    },
    onDragLeave: (event: ZoneEvent) => {
      if (leftZone(event)) setDragging(false);
    },
    onDrop: (event: ZoneEvent) => {
      if (!carriesFiles(event)) return;
      event.preventDefault();
      setDragging(false);
      const file = event.dataTransfer.files?.[0];
      if (file) onFileDrop(file);
    },
  };
}

/** Tracks a file being dragged over the editor, and hands over the file that is dropped. */
export function useFileDrop(onFileDrop: FileHandler) {
  const [dragging, setDragging] = useState(false);

  return { dragging, dropZone: createDropZone(setDragging, onFileDrop) };
}
