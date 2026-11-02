import { useRef } from 'react';
import { ANALYZE_TEXT } from '../content/analyze';

/** The "Open file" button and the hidden file picker behind it. */
export function OpenFileButton({ onFileLoad }: { onFileLoad: (file: File) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="btn-paper px-5 py-2.5 text-sm font-bold tracking-wide uppercase"
      >
        {ANALYZE_TEXT.openFileButton}
      </button>
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
    </>
  );
}
