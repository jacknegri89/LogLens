import { describe, expect, it } from 'vitest';

import type { Language } from '../../types/language';
import { buildFindings } from '../findings';
import { makeTitle } from '../ruleMatching';
import type { AIReport } from '../schema';
import { RulesProvider } from './rulesProvider';

const provider = new RulesProvider();

const INCIDENT = [
  '2026-11-03T09:14:07Z ERROR connect ECONNREFUSED 10.0.2.15:5432',
  '2026-11-03T09:14:08Z WARN pool exhausted, 20/20 connections in use',
  "2026-11-03T09:14:09Z ERROR TypeError: Cannot read properties of undefined (reading 'rows')",
  '    at getOrders (/app/src/orders.js:42:18)',
  '2026-11-03T09:14:12Z ERROR Failed password for root from 203.0.113.7 port 52211 ssh2',
].join('\n');

/** Words that only an English sentence uses; none of them is a technical term or a category. */
const ENGLISH_WORDS =
  /\b(?:the|and|which|with|because|should|that|this|does|not|your|when|then|probable|likely|order of events)\b/i;

function analyze(excerpt: string, language?: Language): Promise<AIReport> {
  return provider.analyze({ excerpt, severityHint: 'low', language });
}

/** The sentences the rules wrote: the log lines and the category names are left out. */
function proseOf(report: AIReport): string {
  const logText = [
    ...report.keyLines,
    ...(report.findings ?? []).flatMap((finding) => [finding.title, finding.evidence]),
    ...(report.timeline ?? []).flatMap((entry) => [entry.title, entry.evidence]),
    ...(report.findings ?? []).map((finding) => finding.category),
  ];
  const markdownWithoutLog = report.bugReportMarkdown.replace(/^(`{3,})[\s\S]*?\1$/m, '');
  const prose = [
    ...report.causes,
    ...report.debugSteps,
    ...(report.overview ?? []),
    markdownWithoutLog,
  ].join('\n');
  return logText.reduce((text, part) => text.replaceAll(part, ''), prose);
}

describe('RulesProvider in Italian', () => {
  it('writes the overview of a database incident in Italian', async () => {
    const report = await analyze(INCIDENT, 'it');

    expect(report.overview?.[0]).toMatch(/^Probabile causa radice: connect ECONNREFUSED/);
    expect(report.overview?.[0]).toContain('Conseguenze probabili:');
    expect(report.overview?.[0]).toContain('correggi prima il database');
    expect(report.overview?.[1]).toMatch(/^Ordine degli eventi: 09:14:07 connect ECONNREFUSED/);
  });

  it('writes the causes and the steps in Italian, led by the root cause sentence', async () => {
    const report = await analyze(INCIDENT, 'it');

    expect(report.causes[0]).toBe(report.overview?.[0]);
    expect(report.causes).toContain('Un firewall o una network policy blocca la connessione.');
    expect(report.debugSteps[0]).toMatch(/^Verifica che il servizio di destinazione/);
    expect(report.debugSteps).toContain(
      'Confronta host e porta nella configurazione (per esempio DATABASE_URL) con quelli reali.',
    );
  });

  it('writes the headings of the issue text in Italian', async () => {
    const { bugReportMarkdown } = await analyze(INCIDENT, 'it');

    expect(bugReportMarkdown).toContain('**Severità:** high');
    expect(bugReportMarkdown).toContain('**Categoria:** Database');
    expect(bugReportMarkdown).toContain('### Quadro generale');
    expect(bugReportMarkdown).toContain('### Righe di log');
    expect(bugReportMarkdown).toContain('### Cause probabili');
    expect(bugReportMarkdown).toContain('### Prossimi passi consigliati');
    expect(bugReportMarkdown).toContain('_Report generato dal motore a regole di LogLens._');
    expect(bugReportMarkdown).not.toContain('Big picture');
    expect(bugReportMarkdown).not.toContain('rules engine');
  });

  it('leaves no English sentence of the rules in the Italian report', async () => {
    const italian = await analyze(INCIDENT, 'it');
    const english = await analyze(INCIDENT, 'en');
    const italianProse = proseOf(italian);

    expect(italianProse).not.toMatch(ENGLISH_WORDS);
    const englishSentences = [
      ...english.causes,
      ...english.debugSteps,
      ...(english.overview ?? []),
    ];
    for (const sentence of englishSentences) expect(italianProse).not.toContain(sentence);
  });

  it('keeps categories, severities, techniques, titles and evidence exactly as in English', async () => {
    const italian = await analyze(INCIDENT, 'it');
    const english = await analyze(INCIDENT, 'en');

    expect(italian.category).toBe(english.category);
    expect(italian.severity).toBe(english.severity);
    expect(italian.title).toBe(english.title);
    expect(italian.keyLines).toEqual(english.keyLines);
    expect(italian.findings).toEqual(english.findings);
    expect(italian.findings?.map((finding) => finding.technique)).toContain('T1110 Brute Force');
    expect(italian.timeline).toEqual(english.timeline);
  });

  it('is deterministic', async () => {
    expect(await analyze(INCIDENT, 'it')).toEqual(await analyze(INCIDENT, 'it'));
  });

  it('quotes the details of the log in Italian', async () => {
    const report = await analyze('FATAL: password authentication failed for user "app_user"', 'it');

    expect(report.causes[0]).toBe(
      "Credenziali errate per l'utente app_user su PostgreSQL: il server ha rifiutato la password (FATAL: password authentication failed).",
    );
  });

  it('uses the Italian wording when the log does not show the detail', async () => {
    const report = await analyze('FATAL: password authentication failed for user', 'it');

    expect(report.causes[0]).toContain("l'utente configurato");
  });

  it('describes a failing line that no rule knows in Italian', async () => {
    const report = await analyze('2026-06-20T10:02:14Z ERROR payments: charge rejected', 'it');

    expect(report.causes[0]).toBe(
      'La riga che segnala il guasto è: "2026-06-20T10:02:14Z ERROR payments: charge rejected". Letti dalla riga: ora 2026-06-20T10:02:14Z; livello ERROR.',
    );
    expect(report.causes[1]).toContain('Le regole non hanno una voce per questo messaggio');
    expect(report.debugSteps[0]).toMatch(/^Leggi la prima riga di errore/);
  });

  it('says in Italian that a log without failures holds normal activity', async () => {
    const report = await analyze('INFO server started on port 3001', 'it');

    expect(report.causes).toEqual([
      "L'estratto contiene solo attività normale: nessuna riga segnala un guasto.",
    ]);
  });

  it('writes the brute force escalation in Italian and raises the severity', async () => {
    const lines = [
      'Nov  3 09:14:01 host sshd[1]: Failed password for root from 203.0.113.7 port 1 ssh2',
      'Nov  3 09:14:02 host sshd[1]: Failed password for root from 203.0.113.7 port 2 ssh2',
      'Nov  3 09:14:03 host sshd[1]: Failed password for root from 203.0.113.7 port 3 ssh2',
      'Nov  3 09:14:04 host sshd[1]: Accepted password for root from 203.0.113.7 port 4 ssh2',
    ].join('\n');
    const report = await analyze(lines, 'it');

    expect(report.severity).toBe('critical');
    expect(report.overview?.[0]).toBe(
      "Possibile brute force riuscito: 3 righe di login fallito da 203.0.113.7 sono state seguite da un login accettato per root. Considera l'account root compromesso: cambia le sue credenziali, termina le sue sessioni e controlla cosa ha fatto dopo il login.",
    );
  });

  it('writes the title of an access log line in Italian', () => {
    const line = '10.0.0.5 - - [03/Nov/2026:09:14:07 +0000] "GET /api/orders HTTP/1.1" 500 12';

    expect(makeTitle([line], 'it')).toBe('GET /api/orders ha risposto 500');
    expect(makeTitle([line], 'en')).toBe('GET /api/orders returned 500');
    expect(makeTitle([''], 'it')).toBe('Problema sconosciuto');
    expect(buildFindings(`${line}\n${INCIDENT}`, 'low', 'it')[0]?.title).toMatch(/ha risposto 500/);
  });
});

describe('RulesProvider language choice', () => {
  it('answers in English when no language is given', async () => {
    const withoutLanguage = await analyze(INCIDENT);

    expect(withoutLanguage).toEqual(await analyze(INCIDENT, 'en'));
    expect(withoutLanguage.overview?.[0]).toMatch(/^Probable root cause:/);
    expect(withoutLanguage.bugReportMarkdown).toContain('**Severity:** high');
  });

  it('does not leave Italian in an English report', async () => {
    const report = await analyze(INCIDENT, 'en');
    const text = [...report.causes, ...report.debugSteps, report.bugReportMarkdown].join('\n');

    expect(text).not.toMatch(/Conseguenze|Quadro generale|Causa|Verifica che|Prossimi passi/);
  });
});
