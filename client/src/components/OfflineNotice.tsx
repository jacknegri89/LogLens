/** Tells the visitor the page shows the copy saved in this browser, one sentence per line. */
export function OfflineNotice({ lines, className = '' }: { lines: string[]; className?: string }) {
  return (
    <div role="status" className={`offline-notice ${className}`}>
      {lines.map((line) => (
        <p key={line}>{line}</p>
      ))}
    </div>
  );
}
