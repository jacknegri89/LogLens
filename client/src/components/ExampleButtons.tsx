import { ANALYZE_TEXT } from '../content/analyze';
import { EXAMPLES } from '../content/examples';

/** Buttons that fill the editor with a sample log. */
export function ExampleButtons({ onPickExample }: { onPickExample: (content: string) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
      <span className="text-ink-soft">{ANALYZE_TEXT.examplesLabel}</span>
      {EXAMPLES.map((example) => (
        <button
          key={example.label}
          type="button"
          onClick={() => onPickExample(example.content)}
          className="font-bold underline decoration-2 underline-offset-4 hover:bg-marker"
        >
          {example.label}
        </button>
      ))}
    </div>
  );
}
