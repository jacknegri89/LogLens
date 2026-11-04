import { defineText } from '../i18n/defineText';

/** Text of the site frame: brand, navigation, language switch and footer. */
export const LAYOUT_TEXT = defineText({
  en: {
    brand: 'LogLens',
    navLabel: 'Main',
    languageLabel: 'Language',
    analyze: 'Analyze',
    workbench: 'Workbench',
    history: 'History',
    calmLabel: 'Calm',
    calmHint: 'Stop the animations and lighten the page',
    skipToContent: 'Skip to content',
    footerPrivacy:
      'Your log is sent only when you press Analyze. Turn on Anonymize to replace IPs, e-mails and secrets in your browser first.',
  },
  it: {
    brand: 'LogLens',
    navLabel: 'Principale',
    languageLabel: 'Lingua',
    analyze: 'Analizza',
    workbench: 'Workbench',
    history: 'Cronologia',
    calmLabel: 'Calma',
    calmHint: 'Ferma le animazioni e alleggerisci la pagina',
    skipToContent: 'Salta al contenuto',
    footerPrivacy:
      'Il tuo log viene inviato solo quando premi Analizza. Attiva Anonimizza per sostituire prima, nel tuo browser, IP, e-mail e segreti.',
  },
});
