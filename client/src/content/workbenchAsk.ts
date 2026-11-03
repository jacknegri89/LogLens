import { defineText } from '../i18n/defineText';

/** Text of the Workbench "Ask" view: the engine choice, the quick questions and the built-in answers. */
export const ASK_TEXT = defineText({
  en: {
    gate: {
      title: 'Analyze the log first',
      body: 'Questions are answered from the analysis of your log. Run the analysis to start asking.',
      action: 'Analyze this log',
      running: 'Analyzing',
      noLog: 'Load a log in the Explorer first.',
    },
    privacy: {
      title: 'What leaves this page',
      builtin:
        'The built-in engine runs inside this page. Nothing is sent anywhere, and the same question always gets the same answer.',
      ollama:
        'With Ollama this page talks to the server at the address you set, usually on your own computer. It sends a short summary of the analysis, never the whole log.',
    },
    engine: {
      label: 'Answer engine',
      builtin: 'Built-in rules',
      builtinHint: 'Fixed rules over the analysis. No key, no network.',
      ollama: 'Ollama (local)',
      ollamaHint: 'A language model that runs on your computer.',
      urlLabel: 'Ollama address',
      modelLabel: 'Model',
      pickModel: 'Choose a model',
      refresh: 'Refresh models',
      loading: 'Loading models',
      ready: '{count} models found.',
      noModels:
        'Ollama answered but has no models. Install one first, for example: ollama pull llama3.2',
      invalidUrl: 'This is not a valid http or https address.',
      help: 'The browser can reach Ollama only if it allows this site: start it with OLLAMA_ORIGINS set to {origin}. The address stays on your computer.',
      saved: 'The choice is remembered in this browser.',
      notSaved: 'This browser blocks storage, so the choice lasts until you leave the page.',
      errors: {
        invalidUrl: 'This is not a valid http or https address.',
        unreachable:
          'The Ollama server did not answer. Is it running at this address, and does it allow this site?',
        http: 'The Ollama server refused the request. Check the model name.',
        badResponse: 'The Ollama server sent an answer this page could not read.',
        stream: 'Ollama stopped with an error while answering.',
        noModel: 'Choose a model first.',
      },
    },
    prompts: {
      label: 'Quick questions',
      items: [
        { intent: 'rootCause', question: 'What is the root cause?' },
        { intent: 'firstStep', question: 'What should I do first?' },
        { intent: 'isAttack', question: 'Is this an attack?' },
        { intent: 'firstFailure', question: 'Which line failed first?' },
        { intent: 'impact', question: 'What is the impact?' },
        { intent: 'prevent', question: 'How can I prevent this?' },
        { intent: 'explainSimply', question: 'Explain it in simple words' },
        { intent: 'timeline', question: 'What happened, in order?' },
      ],
    },
    chat: {
      label: 'Conversation',
      empty: 'Pick a quick question or write your own. Answers use only what the analysis found.',
      inputLabel: 'Your question',
      placeholder: 'Ask about this log',
      send: 'Ask',
      stop: 'Stop',
      clear: 'Clear',
      you: 'You',
      answerFrom: 'Answer from {engine}',
      builtinName: 'built-in rules',
      waiting: 'Waiting for the model',
      stopped: 'Stopped.',
      tooLong: 'The question is cut at {max} characters.',
    },
    context: {
      summary: 'What Ollama receives',
      note: 'Only this summary is sent, never the whole log. It is marked as untrusted data inside the prompt.',
    },
    answers: {
      rootCause: {
        lead: 'Most likely root cause: {cause}',
        others: 'Other possible causes:',
        chain: 'In the order of events, the first one is "{title}"{when}.',
        at: ' at {time}',
        none: 'The analysis did not list a cause for this log.',
      },
      firstStep: {
        lead: 'Start here: {step}',
        then: 'After that:',
        none: 'The analysis did not list debug steps for this log.',
      },
      isAttack: {
        yes: 'Yes, the analysis found signs of an attack. Category: {category}, severity: {severity}.',
        no: 'The analysis does not point to an attack: it classified this log as "{category}". That means no attack signature matched, not that nothing malicious happened.',
        signals: 'What it found:',
        technique: 'MITRE {technique}',
        owasp: 'OWASP {owasp}',
      },
      firstFailure: {
        lead: 'The first failing line the analysis flagged{place}:',
        place: ' (line {number} of the log)',
        none: 'The analysis did not flag a failing line.',
      },
      impact: {
        lead: 'Severity: {severity}. Category: {category}. Distinct events found: {count}.',
        overview: 'Big picture:',
        effects: 'Effects that followed the root event:',
        scope: 'The analysis does not measure how many users or requests were affected.',
      },
      prevent: {
        lead: 'To stop it from coming back, deal with the causes:',
        steps: 'Steps from the report:',
        pointer: 'The Fix tab has a code patch, a test and an alert rule for this kind of problem.',
        none: 'The analysis listed no cause for this log, so there is nothing specific to prevent.',
      },
      explainSimply: {
        text: 'In plain words: the log shows a "{category}" problem: {title}.',
        because: 'The most likely reason: {cause}',
        first: 'The first thing to try: {step}',
        noCause: 'The analysis found no clear reason.',
      },
      timeline: {
        lead: 'Order of events:',
        line: '{number}. {when}{title} ({role})',
        when: '{time} - ',
        roles: { root: 'root cause', effect: 'effect', independent: 'separate event' },
        single: 'The analysis found a single event, so there is no sequence to show.',
      },
      fallback: {
        lead: 'I did not understand that question. From this analysis I can answer:',
        topics: [
          'what the root cause is',
          'what to do first',
          'whether it is an attack',
          'which line failed first',
          'what the impact is',
          'how to prevent it',
          'an explanation in simple words',
          'what happened, in order',
        ],
      },
    },
  },
  it: {
    gate: {
      title: 'Prima analizza il log',
      body: 'Le domande trovano risposta nell’analisi del tuo log. Avvia l’analisi per cominciare.',
      action: 'Analizza questo log',
      running: 'Analisi in corso',
      noLog: 'Prima carica un log nell’Esplora.',
    },
    privacy: {
      title: 'Cosa esce da questa pagina',
      builtin:
        'Il motore integrato lavora dentro questa pagina. Non viene inviato nulla e la stessa domanda dà sempre la stessa risposta.',
      ollama:
        'Con Ollama questa pagina parla con il server all’indirizzo che imposti, di solito sul tuo computer. Invia un breve riassunto dell’analisi, mai l’intero log.',
    },
    engine: {
      label: 'Motore delle risposte',
      builtin: 'Regole integrate',
      builtinHint: 'Regole fisse sull’analisi. Nessuna chiave, nessuna rete.',
      ollama: 'Ollama (locale)',
      ollamaHint: 'Un modello linguistico che gira sul tuo computer.',
      urlLabel: 'Indirizzo di Ollama',
      modelLabel: 'Modello',
      pickModel: 'Scegli un modello',
      refresh: 'Aggiorna i modelli',
      loading: 'Caricamento dei modelli',
      ready: 'Trovati {count} modelli.',
      noModels:
        'Ollama ha risposto ma non ha modelli. Installane uno, per esempio: ollama pull llama3.2',
      invalidUrl: 'Non è un indirizzo http o https valido.',
      help: 'Il browser raggiunge Ollama solo se questo sito è consentito: avvialo con OLLAMA_ORIGINS impostato su {origin}. L’indirizzo resta sul tuo computer.',
      saved: 'La scelta viene ricordata in questo browser.',
      notSaved:
        'Questo browser blocca la memoria locale: la scelta dura finché non lasci la pagina.',
      errors: {
        invalidUrl: 'Non è un indirizzo http o https valido.',
        unreachable:
          'Il server Ollama non risponde. È acceso a questo indirizzo e consente questo sito?',
        http: 'Il server Ollama ha rifiutato la richiesta. Controlla il nome del modello.',
        badResponse: 'Il server Ollama ha inviato una risposta che la pagina non sa leggere.',
        stream: 'Ollama si è fermato con un errore mentre rispondeva.',
        noModel: 'Scegli prima un modello.',
      },
    },
    prompts: {
      label: 'Domande rapide',
      items: [
        { intent: 'rootCause', question: 'Qual è la causa?' },
        { intent: 'firstStep', question: 'Cosa devo fare per prima cosa?' },
        { intent: 'isAttack', question: 'È un attacco?' },
        { intent: 'firstFailure', question: 'Quale riga ha fallito per prima?' },
        { intent: 'impact', question: 'Qual è l’impatto?' },
        { intent: 'prevent', question: 'Come posso evitare che succeda ancora?' },
        { intent: 'explainSimply', question: 'Spiegamelo in modo semplice' },
        { intent: 'timeline', question: 'Cosa è successo, in ordine?' },
      ],
    },
    chat: {
      label: 'Conversazione',
      empty:
        'Scegli una domanda rapida o scrivi la tua. Le risposte usano solo ciò che l’analisi ha trovato.',
      inputLabel: 'La tua domanda',
      placeholder: 'Chiedi qualcosa su questo log',
      send: 'Chiedi',
      stop: 'Ferma',
      clear: 'Svuota',
      you: 'Tu',
      answerFrom: 'Risposta di {engine}',
      builtinName: 'regole integrate',
      waiting: 'In attesa del modello',
      stopped: 'Fermato.',
      tooLong: 'La domanda viene tagliata a {max} caratteri.',
    },
    context: {
      summary: 'Cosa riceve Ollama',
      note: 'Viene inviato solo questo riassunto, mai l’intero log. Nel prompt è indicato come dato non fidato.',
    },
    answers: {
      rootCause: {
        lead: 'Causa più probabile: {cause}',
        others: 'Altre cause possibili:',
        chain: 'Nell’ordine degli eventi, il primo è "{title}"{when}.',
        at: ' alle {time}',
        none: 'L’analisi non ha indicato una causa per questo log.',
      },
      firstStep: {
        lead: 'Parti da qui: {step}',
        then: 'Poi:',
        none: 'L’analisi non ha indicato passaggi di debug per questo log.',
      },
      isAttack: {
        yes: 'Sì, l’analisi ha trovato segnali di un attacco. Categoria: {category}, gravità: {severity}.',
        no: 'L’analisi non indica un attacco: ha classificato questo log come "{category}". Significa che nessuna firma d’attacco corrisponde, non che non sia successo nulla di dannoso.',
        signals: 'Cosa ha trovato:',
        technique: 'MITRE {technique}',
        owasp: 'OWASP {owasp}',
      },
      firstFailure: {
        lead: 'La prima riga con un errore segnalata dall’analisi{place}:',
        place: ' (riga {number} del log)',
        none: 'L’analisi non ha segnalato righe con errori.',
      },
      impact: {
        lead: 'Gravità: {severity}. Categoria: {category}. Eventi distinti trovati: {count}.',
        overview: 'Quadro generale:',
        effects: 'Effetti seguiti all’evento di origine:',
        scope: 'L’analisi non misura quanti utenti o richieste sono stati colpiti.',
      },
      prevent: {
        lead: 'Per evitare che torni, intervieni sulle cause:',
        steps: 'Passaggi del rapporto:',
        pointer:
          'La vista Correzione ha una modifica al codice, un test e una regola di allarme per questo tipo di problema.',
        none: 'L’analisi non ha indicato cause per questo log, quindi non c’è nulla di specifico da prevenire.',
      },
      explainSimply: {
        text: 'In parole semplici: il log mostra un problema di tipo "{category}": {title}.',
        because: 'Il motivo più probabile: {cause}',
        first: 'La prima cosa da provare: {step}',
        noCause: 'L’analisi non ha trovato un motivo chiaro.',
      },
      timeline: {
        lead: 'Ordine degli eventi:',
        line: '{number}. {when}{title} ({role})',
        when: '{time} - ',
        roles: { root: 'causa di origine', effect: 'effetto', independent: 'evento separato' },
        single: 'L’analisi ha trovato un solo evento, quindi non c’è una sequenza da mostrare.',
      },
      fallback: {
        lead: 'Non ho capito la domanda. Da questa analisi posso rispondere su:',
        topics: [
          'qual è la causa',
          'cosa fare per prima cosa',
          'se è un attacco',
          'quale riga ha fallito per prima',
          'qual è l’impatto',
          'come prevenirlo',
          'una spiegazione in parole semplici',
          'cosa è successo, in ordine',
        ],
      },
    },
  },
});

export type AskText = (typeof ASK_TEXT)['en'];
export type AskAnswerText = AskText['answers'];
