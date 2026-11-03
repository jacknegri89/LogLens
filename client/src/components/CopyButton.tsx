import { useState } from 'react';

const COPIED_MESSAGE_MS = 1500;

interface CopyButtonProps {
  text: string;
  label: string;
  copiedLabel: string;
  className?: string;
}

/** Copies the text to the clipboard and briefly shows that it worked. */
export function CopyButton({ text, label, copiedLabel, className }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), COPIED_MESSAGE_MS);
    } catch {
      // The clipboard can be blocked (for example on an insecure page); fail silently.
    }
  }

  return (
    <button type="button" onClick={onCopy} className={className}>
      {copied ? copiedLabel : label}
    </button>
  );
}
