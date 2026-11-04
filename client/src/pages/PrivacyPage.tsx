import { PRIVACY_TEXT } from '../content/privacy';
import { useText } from '../i18n/useText';

/** The privacy and cookie notice: what is handled, why, where it goes, and for how long. */
export function PrivacyPage() {
  const text = useText(PRIVACY_TEXT);
  return (
    <article className="legal-page">
      <header className="legal-heading">
        <h1 className="legal-title">{text.title}</h1>
        <p className="legal-updated">{text.updated}</p>
        <p className="legal-intro">{text.intro}</p>
      </header>
      {text.sections.map((section) => (
        <section key={section.heading} className="legal-section">
          <h2 className="legal-section-title">{section.heading}</h2>
          {section.body.map((paragraph) => (
            <p key={paragraph} className="legal-paragraph">
              {paragraph}
            </p>
          ))}
        </section>
      ))}
    </article>
  );
}
