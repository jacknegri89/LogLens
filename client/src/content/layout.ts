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
    skipToContent: 'Salta al contenuto',
    footerPrivacy:
      'Il tuo log viene inviato solo quando premi Analizza. Attiva Anonimizza per sostituire prima, nel tuo browser, IP, e-mail e segreti.',
  },
});
