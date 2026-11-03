import { useState } from 'react';

/**
 * Wraps the editor's loaders so each new file or example replays the "printing"
 * reveal, and remembers the size of the last file for the file chip.
 */
export function useEditorReveal(
  onFileLoad: (file: File) => void,
  onPickExample: (content: string) => void,
) {
  const [fileSize, setFileSize] = useState(0);
  const [revealKey, setRevealKey] = useState(0);

  function loadFile(file: File) {
    setFileSize(file.size);
    setRevealKey((key) => key + 1);
    onFileLoad(file);
  }

  function pickExample(content: string) {
    setRevealKey((key) => key + 1);
    onPickExample(content);
  }

  return { fileSize, revealKey, loadFile, pickExample };
}
