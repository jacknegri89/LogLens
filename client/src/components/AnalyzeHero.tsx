import { ANALYZE_TEXT } from '../content/analyze';
import { LensStage } from './LensStage';

/** The first screen of the Analyze page: the headline and the magnifying glass. */
export function AnalyzeHero() {
  return (
    <section className="grid items-center gap-10 pt-6 pb-16 lg:grid-cols-[1fr_1.1fr] lg:pt-10">
      <div>
        <h1 className="text-[clamp(2.9rem,7.4vw,6.2rem)] leading-[0.92] font-extrabold tracking-tight uppercase [font-stretch:125%]">
          {ANALYZE_TEXT.heroLines.map((line, i) => (
            <span key={line}>
              {i > 0 && <br />}
              {line} {/* keeps the space before the next word */}
            </span>
          ))}
          <span className="marker">{ANALYZE_TEXT.heroMarked}</span>
        </h1>
        <p className="mt-8 max-w-md text-lg leading-relaxed text-chalk">{ANALYZE_TEXT.heroIntro}</p>
      </div>
      <LensStage />
    </section>
  );
}
