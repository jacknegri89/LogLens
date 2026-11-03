/** The incident overview as short sentences, one arrow each, in the same list style as the causes. */
export function BigPicture({ sentences }: { sentences: string[] }) {
  return (
    <ul className="space-y-3 text-[17px] leading-relaxed">
      {sentences.map((sentence, i) => (
        <li key={i} className="flex gap-3">
          <span className="font-extrabold text-marker" aria-hidden="true">
            →
          </span>
          <span>{sentence}</span>
        </li>
      ))}
    </ul>
  );
}
