import { useEffect, useRef, useState } from 'react';

const COPIED_MESSAGE_MS = 1500;

/** Copies text to the clipboard and says for a moment that it worked. */
export function useCopyFeedback() {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), COPIED_MESSAGE_MS);
    } catch {
      // The clipboard can be blocked (for example on an insecure page): the button then stays as it was.
    }
  }

  return { copied, copy };
}
