import { defineText } from '../i18n/defineText';
import { withCount } from '../i18n/plural';

/** "N attack signals from M addresses"; the address part is left out when no address was readable. */
function alertLine(signals: number, addresses: number, forms: Forms): string {
  const signalPart = withCount(signals, forms.signals);
  if (addresses > 0) {
    return `${signalPart} ${forms.from} ${withCount(addresses, forms.addresses)}`;
  }
  return signalPart;
}

interface Forms {
  signals: readonly [string, string];
  addresses: readonly [string, string];
  from: string;
}

const EN_FORMS: Forms = {
  signals: ['attack signal', 'attack signals'],
  addresses: ['address', 'addresses'],
  from: 'from',
};
const IT_FORMS: Forms = {
  signals: ['segnale di attacco', 'segnali di attacco'],
  addresses: ['indirizzo', 'indirizzi'],
  from: 'da',
};

/** Text of the privacy scrubber button and of the Security view. */
export const SECURITY_TEXT = defineText({
  en: {
    scrub: {
      button: 'Sanitize log',
      hint: 'Replaces IPs, e-mails, secrets, tokens and user names in the loaded log, here in your browser.',
      done: (count: number) => `${withCount(count, ['item', 'items'])} sanitized`,
      nothing: 'Nothing sensitive found',
      undo: 'Undo',
      undoHint: 'Restore the log as it was before sanitizing',
    },
    panel: {
      title: 'Security scan',
      intro:
        'Looks for injection payloads, probes for sensitive files, scanner tools and brute force in the loaded log. Everything runs in your browser.',
      empty: 'Load a log to scan it for attacks.',
      scanned: (lines: number) => `${withCount(lines, ['line', 'lines'])} scanned`,
      clean: 'No attack signals found.',
      alertStamp: 'Alert',
      alert: (signals: number, addresses: number) => alertLine(signals, addresses, EN_FORMS),
      alertHint: 'Review the groups below and block the addresses you do not trust.',
      severity: { high: 'High', medium: 'Medium' },
      lines: (count: number) => withCount(count, ['line', 'lines']),
      topAddresses: 'Top addresses',
      noAddress: 'No address in these lines',
      samples: 'Example lines',
      openLine: (line: number) => `Select line ${line}`,
      owaspLabel: 'OWASP Top 10',
      mitreLabel: 'MITRE ATT&CK',
      types: {
        sqlInjection: {
          title: 'SQL injection',
          description:
            'Requests that try to change a database query: UNION SELECT, always-true conditions, delays.',
        },
        xss: {
          title: 'Cross-site scripting',
          description:
            'Script tags, event handlers and javascript: links sent to run code in a visitor browser.',
        },
        pathTraversal: {
          title: 'Path traversal',
          description: 'Paths with ../ or system files, used to read files outside the web folder.',
        },
        commandInjection: {
          title: 'Command injection',
          description: 'Shell commands hidden in a parameter: separators, $( ), reverse shells.',
        },
        log4shell: {
          title: 'Log4Shell',
          description: 'The ${jndi:...} lookup that abuses Log4j to load remote code.',
        },
        bruteForce: {
          title: 'Brute force',
          description: 'Five or more rejected logins from one address within five minutes.',
        },
        sensitivePath: {
          title: 'Sensitive file probes',
          description:
            'Requests for .env, .git, admin panels and other files a visitor should never ask for.',
        },
        scannerAgent: {
          title: 'Scanner tools',
          description: 'User agents of security scanners such as sqlmap, nikto or nmap.',
        },
      },
      owasp: {
        A01: 'A01:2021 Broken Access Control',
        A03: 'A03:2021 Injection',
        A05: 'A05:2021 Security Misconfiguration',
        A06: 'A06:2021 Vulnerable and Outdated Components',
        A07: 'A07:2021 Identification and Authentication Failures',
      },
      mitre: {
        T1190: 'T1190 Exploit Public-Facing Application',
        T1059: 'T1059 Command and Scripting Interpreter',
        T1110: 'T1110 Brute Force',
        'T1595.002': 'T1595.002 Vulnerability Scanning',
        'T1595.003': 'T1595.003 Wordlist Scanning',
      },
    },
    mitigation: {
      title: 'Mitigation',
      intro:
        'Commands and rules built only from the valid addresses found above and from fixed patterns, never from text copied out of the log. Read them before you apply them.',
      caution: 'Make sure none of these addresses is yours or a service you rely on.',
      copy: 'Copy',
      copied: 'Copied',
      snippets: {
        iptables: {
          title: 'iptables',
          hint: 'Run as root on the server. Rules last until reboot.',
        },
        ufw: { title: 'ufw', hint: 'Run as root on Ubuntu or Debian.' },
        cloudflareAddresses: {
          title: 'Cloudflare: block addresses',
          hint: 'Custom rule expression, action Block.',
        },
        cloudflarePatterns: {
          title: 'Cloudflare: block patterns',
          hint: 'Custom rule expression, action Block. Check it does not match your real pages.',
        },
        nginx: {
          title: 'nginx',
          hint: 'Put in the http, server or location block, then run nginx -t and reload.',
        },
        fail2ban: {
          title: 'fail2ban',
          hint: 'Two files. Adjust logpath to your access log, then reload fail2ban.',
        },
      },
    },
  },
  it: {
    scrub: {
      button: 'Oscura dati sensibili',
      hint: 'Sostituisce IP, e-mail, segreti, token e nomi utente nel log caricato, qui nel tuo browser.',
      done: (count: number) => `${withCount(count, ['elemento oscurato', 'elementi oscurati'])}`,
      nothing: 'Nessun dato sensibile trovato',
      undo: 'Annulla',
      undoHint: 'Ripristina il log com’era prima di oscurarlo',
    },
    panel: {
      title: 'Scansione di sicurezza',
      intro:
        'Cerca nel log caricato payload di injection, richieste a file sensibili, strumenti di scansione e brute force. Tutto avviene nel tuo browser.',
      empty: 'Carica un log per cercare attacchi.',
      scanned: (lines: number) => `${withCount(lines, ['riga esaminata', 'righe esaminate'])}`,
      clean: 'Nessun segnale di attacco trovato.',
      alertStamp: 'Allarme',
      alert: (signals: number, addresses: number) => alertLine(signals, addresses, IT_FORMS),
      alertHint: 'Controlla i gruppi qui sotto e blocca gli indirizzi di cui non ti fidi.',
      severity: { high: 'Alta', medium: 'Media' },
      lines: (count: number) => withCount(count, ['riga', 'righe']),
      topAddresses: 'Indirizzi più attivi',
      noAddress: 'Nessun indirizzo in queste righe',
      samples: 'Righe di esempio',
      openLine: (line: number) => `Seleziona la riga ${line}`,
      owaspLabel: 'OWASP Top 10',
      mitreLabel: 'MITRE ATT&CK',
      types: {
        sqlInjection: {
          title: 'SQL injection',
          description:
            'Richieste che cercano di cambiare una query: UNION SELECT, condizioni sempre vere, ritardi.',
        },
        xss: {
          title: 'Cross-site scripting',
          description:
            'Tag script, gestori di eventi e link javascript: inviati per eseguire codice nel browser di un visitatore.',
        },
        pathTraversal: {
          title: 'Path traversal',
          description:
            'Percorsi con ../ o file di sistema, usati per leggere file fuori dalla cartella del sito.',
        },
        commandInjection: {
          title: 'Command injection',
          description:
            'Comandi di shell nascosti in un parametro: separatori, $( ), reverse shell.',
        },
        log4shell: {
          title: 'Log4Shell',
          description: 'La chiamata ${jndi:...} che sfrutta Log4j per caricare codice remoto.',
        },
        bruteForce: {
          title: 'Brute force',
          description: 'Cinque o più accessi respinti dallo stesso indirizzo in cinque minuti.',
        },
        sensitivePath: {
          title: 'Richieste a file sensibili',
          description:
            'Richieste di .env, .git, pannelli di amministrazione e altri file che un visitatore non dovrebbe chiedere.',
        },
        scannerAgent: {
          title: 'Strumenti di scansione',
          description: 'User agent di scanner di sicurezza come sqlmap, nikto o nmap.',
        },
      },
      owasp: {
        A01: 'A01:2021 Broken Access Control',
        A03: 'A03:2021 Injection',
        A05: 'A05:2021 Security Misconfiguration',
        A06: 'A06:2021 Vulnerable and Outdated Components',
        A07: 'A07:2021 Identification and Authentication Failures',
      },
      mitre: {
        T1190: 'T1190 Exploit Public-Facing Application',
        T1059: 'T1059 Command and Scripting Interpreter',
        T1110: 'T1110 Brute Force',
        'T1595.002': 'T1595.002 Vulnerability Scanning',
        'T1595.003': 'T1595.003 Wordlist Scanning',
      },
    },
    mitigation: {
      title: 'Mitigazione',
      intro:
        'Comandi e regole costruiti solo con gli indirizzi validi trovati sopra e con schemi fissi, mai con testo copiato dal log. Leggili prima di applicarli.',
      caution: 'Verifica che nessuno di questi indirizzi sia tuo o di un servizio che usi.',
      copy: 'Copia',
      copied: 'Copiato',
      snippets: {
        iptables: {
          title: 'iptables',
          hint: 'Esegui come root sul server. Le regole durano fino al riavvio.',
        },
        ufw: { title: 'ufw', hint: 'Esegui come root su Ubuntu o Debian.' },
        cloudflareAddresses: {
          title: 'Cloudflare: blocca gli indirizzi',
          hint: 'Espressione di una regola personalizzata, azione Block.',
        },
        cloudflarePatterns: {
          title: 'Cloudflare: blocca gli schemi',
          hint: 'Espressione di una regola personalizzata, azione Block. Controlla che non colpisca pagine vere.',
        },
        nginx: {
          title: 'nginx',
          hint: 'Inseriscile nel blocco http, server o location, poi esegui nginx -t e ricarica.',
        },
        fail2ban: {
          title: 'fail2ban',
          hint: 'Due file. Adatta logpath al tuo log di accesso, poi ricarica fail2ban.',
        },
      },
    },
  },
});
