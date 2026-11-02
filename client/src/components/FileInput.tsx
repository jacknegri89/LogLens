import type { RefObject } from 'react';

/** The hidden file picker, opened by the "Open file" button. */
export function FileInput({
  inputRef,
  onFileLoad,
}: {
  inputRef: RefObject<HTMLInputElement | null>;
  onFileLoad: (file: File) => void;
}) {
  return (
    <input
      ref={inputRef}
      type="file"
      accept=".txt,.log,text/plain"
      className="hidden"
      onChange={(event) => {
        const file = event.target.files?.[0];
        if (file) onFileLoad(file);
      }}
    />
  );
}
