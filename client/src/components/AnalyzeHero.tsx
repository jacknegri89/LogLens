import { ANALYZE_TEXT } from '../content/analyze';
import { HeroLogStream } from './HeroLogStream';
import { LensStage } from './LensStage';

/**
 * The first screen: the whole width of the window is the desk under the lamp, with a
 * wall of logs behind the headline and the taped printout under the magnifying glass.
 */
export function AnalyzeHero() {
  return (
    <section className="hero full-bleed">
      <HeroLogStream />
      <span className="hero-lamp" aria-hidden="true" />
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pt-8 pb-20 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:gap-10 lg:pt-14 lg:pb-28">
        <HeroCopy />
        <LensStage />
      </div>
    </section>
  );
}

function HeroCopy() {
  return (
    <div>
      <p className="evidence-label text-marker">{ANALYZE_TEXT.heroCaseLabel}</p>
      <h1 className="mt-5 text-[clamp(3rem,8.4vw,6.6rem)] leading-[0.86] font-black tracking-[-0.02em] uppercase [font-stretch:125%]">
        {ANALYZE_TEXT.heroLines.map((line) => (
          <span key={line} className="block">
            {line}{' '}
          </span>
        ))}
        <span className="hero-marked">{ANALYZE_TEXT.heroMarked}</span>
      </h1>
      <p className="mt-8 max-w-md text-lg leading-relaxed text-chalk [text-shadow:0_0_12px_var(--color-felt),0_0_3px_var(--color-felt)]">
        {ANALYZE_TEXT.heroIntro}
      </p>
      <div className="mt-9 flex flex-wrap items-center gap-x-5 gap-y-3">
        <a
          href="#case-file"
          className="btn-ink px-6 py-3 text-sm font-bold tracking-wide uppercase [border-color:var(--color-paper)]"
        >
          {ANALYZE_TEXT.heroCta}
        </a>
        <span className="font-mono text-sm text-chalk">{ANALYZE_TEXT.heroCtaHint}</span>
      </div>
    </div>
  );
}
