import { EXAMPLES, EXAMPLES_TEXT } from '../content/examples';
import { useText } from '../i18n/useText';

/** Buttons that fill the editor with a sample log. */
export function ExampleButtons({ onPickExample }: { onPickExample: (content: string) => void }) {
  const text = useText(EXAMPLES_TEXT);
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
      <span className="text-ink-soft">{text.heading}</span>
      {EXAMPLES.map((example) => (
        <button
          key={example.id}
          type="button"
          onClick={() => onPickExample(example.content)}
          className="font-bold underline decoration-2 underline-offset-4 hover:bg-marker"
        >
          {text.names[example.id]}
        </button>
      ))}
    </div>
  );
}
