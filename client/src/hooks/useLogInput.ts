import { useState } from 'react';

/** The text in the editor and the name of the file it came from, if any. */
export function useLogInput() {
  const [text, setText] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);

  function changeText(value: string) {
    setText(value);
    setFileName(null);
  }

  function pickExample(content: string) {
    changeText(content);
  }

  function loadFile(file: File) {
    file.text().then((content) => {
      setText(content);
      setFileName(file.name);
    });
  }

  return { text, fileName, changeText, pickExample, loadFile };
}
