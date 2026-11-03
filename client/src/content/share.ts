import { defineText } from '../i18n/defineText';

/** Text of the share block under a report. */
export const SHARE_TEXT = defineText({
  en: {
    title: 'Share',
    description:
      'Create a secret link that shows this report, without the original log, to anyone who has it.',
    warning:
      'The report quotes lines of your log, so any address, name or secret in those lines is visible to everyone who has the link. Check the lines first, and use "Anonymize before sending" for logs you plan to share.',
    create: 'Create share link',
    linkLabel: 'Share link',
    copy: 'Copy link',
    copied: 'Copied',
    stop: 'Stop sharing',
    stopHint: 'Stopping makes the current link stop working.',
    createFailed: 'Could not create the share link',
    stopFailed: 'Could not stop sharing',
  },
  it: {
    title: 'Condividi',
    description:
      'Crea un link segreto che mostra questo report, senza il log originale, a chiunque lo abbia.',
    warning:
      'Il report cita righe del tuo log, quindi ogni indirizzo, nome o segreto in quelle righe è visibile a chiunque abbia il link. Controlla prima le righe e usa "Anonimizza prima dell\'invio" per i log che pensi di condividere.',
    create: 'Crea link di condivisione',
    linkLabel: 'Link di condivisione',
    copy: 'Copia link',
    copied: 'Copiato',
    stop: 'Interrompi la condivisione',
    stopHint: 'Se interrompi la condivisione, il link attuale smette di funzionare.',
    createFailed: 'Impossibile creare il link di condivisione',
    stopFailed: 'Impossibile interrompere la condivisione',
  },
});
