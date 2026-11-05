import { useRef, useState } from 'react';

const MAX_LOG_FILE_BYTES = 600_000;
const MAX_LOG_CHARACTERS = 200_000;
type FileError = 'tooLarge' | 'tooLong' | 'readFailed';

/** The text in the editor and the name of the file it came from, if any. */
export function useLogInput() {
  const [text, setText] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileError, setFileError] = useState<FileError | null>(null);
  const latestRead = useRef(0);

  function changeText(value: string) {
    latestRead.current += 1;
    setFileError(null);
    setText(value);
    setFileName(null);
  }

  function clear() {
    latestRead.current += 1;
    setFileError(null);
    setText('');
    setFileName(null);
  }

  function pickExample(content: string) {
    changeText(content);
  }

  async function loadFile(file: File) {
    const job = ++latestRead.current;
    setFileError(null);
    if (file.size > MAX_LOG_FILE_BYTES) {
      setFileError('tooLarge');
      return;
    }
    try {
      const content = await file.text();
      if (job !== latestRead.current) {
        return;
      }
      if (content.length > MAX_LOG_CHARACTERS) {
        setFileError('tooLong');
        return;
      }
      setText(content);
      setFileName(file.name);
    } catch {
      if (job === latestRead.current) {
        setFileError('readFailed');
      }
    }
  }

  return { text, fileName, fileError, changeText, clear, pickExample, loadFile };
}
