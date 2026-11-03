/**
 * The case summary: the overview sentences typed on a pinned sheet, in their order
 * (root cause first, then what followed), the first one set as the lead.
 */
export function BigPicture({ sentences }: { sentences: string[] }) {
  return (
    <div className="report-summary evidence-sheet">
      <span className="pin" aria-hidden="true" />
      <ol className="report-summary-list">
        {sentences.map((sentence, index) => (
          <li key={index}>{sentence}</li>
        ))}
      </ol>
    </div>
  );
}
