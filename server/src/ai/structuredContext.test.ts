import { describe, expect, it } from 'vitest';

import { analyzeStructure } from '../analysis/analyzeStructure';
import type { AiLimits } from './aiBudget';
import { buildStructuredContext } from './structuredContext';

// Made-up secrets, placed where the context builder copies text: ids, services, attributes, messages.
const SESSION = 'sess_FAKE_ABCDEF0123456789';
const DB_PASSWORD = 'dbPassFAKE99';
const API_KEY = 'sk-FAKEFAKEFAKEFAKEFAKE1234567890';
const COOKIE = 'cookieFAKEvalue12345';
const EMAIL = 'anna.rossi@example.com';
const SECRETS = [SESSION, DB_PASSWORD, API_KEY, COOKIE];

const LIMITS: AiLimits = {
  maxContextChars: 24_000,
  maxContextEvents: 250,
  maxCallsPerAnalysis: 1,
  maxCostUsdPerAnalysis: 0.05,
  inputUsdPerMillionTokens: 0.15,
  outputUsdPerMillionTokens: 0.6,
  timeoutMs: 40_000,
};

const HOSTILE_LOG = [
  `2026-11-04T10:00:00Z INFO [auth] login ok requestId=req-1 sessionId=${SESSION} user=${EMAIL}`,
  `2026-11-04T10:00:01Z ERROR [db://svc:${DB_PASSWORD}@db.internal] connection refused requestId=req-1 sessionId=${SESSION} api_key=${API_KEY}`,
  `2026-11-04T10:00:02Z ERROR [payments] charge failed requestId=req-2 sessionId=${SESSION} cookie=${COOKIE}`,
  `{"time":"2026-11-04T10:00:03Z","level":"error","service":"api","msg":"upstream failed","sessionId":"${SESSION}","authToken":"${API_KEY}"}`,
].join('\n');

function buildHostile() {
  return buildStructuredContext(analyzeStructure(HOSTILE_LOG), LIMITS);
}

describe('the structured context sent to a model', () => {
  it('contains no secret, whichever field the log put it in', () => {
    const { json } = buildHostile();

    for (const secret of SECRETS) {
      expect(json, `"${secret}" reached the context`).not.toContain(secret);
    }
  });

  it('replaces a session id by a stable pseudonym, so events that share it still look related', () => {
    const { json } = buildHostile();

    const document = JSON.parse(json) as { events: { ids?: Record<string, string> }[] };
    const sessions = document.events
      .map((event) => event.ids?.sessionId)
      .filter((value): value is string => value !== undefined);
    expect(sessions.length).toBeGreaterThanOrEqual(3);
    expect(new Set(sessions)).toEqual(new Set(['session-1']));
  });

  it('keeps the identifiers that carry no secret, so the model can follow a request', () => {
    const { json } = buildHostile();

    expect(json).toContain('req-1');
    expect(json).toContain('req-2');
  });

  it('counts the secrets it hid', () => {
    expect(buildHostile().maskedSecrets).toBeGreaterThan(0);
  });
});

describe('the size limit of the structured context', () => {
  function bigLog(failures: number, noise: number): string {
    const lines: string[] = [];
    for (let index = 0; index < noise; index += 1) {
      const second = String(index % 60).padStart(2, '0');
      const minute = String(Math.floor(index / 60) % 60).padStart(2, '0');
      lines.push(`2026-11-04T09:${minute}:${second}Z INFO [web] request handled id=${index}`);
    }
    for (let index = 0; index < failures; index += 1) {
      const second = String(index % 60).padStart(2, '0');
      lines.push(
        `2026-11-04T11:00:${second}Z ERROR [db] connection refused requestId=req-${index} sessionId=s${index}`,
      );
    }
    return lines.join('\n');
  }

  it('applies to the whole document, not only to the events', () => {
    const analysis = analyzeStructure(bigLog(40, 300));
    const limits = { ...LIMITS, maxContextChars: 6000 };

    const context = buildStructuredContext(analysis, limits);

    expect(context.json.length).toBeLessThanOrEqual(limits.maxContextChars);
    expect(context.includedEventIds.size).toBeGreaterThan(0);
  });

  it('keeps every failure of the incidents when the limit is tight and routine lines abound', () => {
    const analysis = analyzeStructure(bigLog(10, 300));
    const limits = { ...LIMITS, maxContextChars: 4500 };

    const context = buildStructuredContext(analysis, limits);

    const failureIds = analysis.incidents.flatMap((incident) => incident.anomalyEventIds);
    const keptFailures = failureIds.filter((id) => context.includedEventIds.has(id));
    expect(failureIds.length).toBeGreaterThan(0);
    expect(keptFailures.length).toBe(failureIds.length);
  });

  it('says how many failures it had to leave out, and never points at an event it left out', () => {
    const analysis = analyzeStructure(bigLog(60, 0));
    const limits = { ...LIMITS, maxContextChars: 5000 };

    const context = buildStructuredContext(analysis, limits);

    const document = JSON.parse(context.json) as {
      coverage: { complete: boolean; sentEvents: number };
      incidents: { failureEvents: string[]; omittedFailureEvents: number }[];
      events: { id: string }[];
      links: { from: string; to: string }[];
    };
    expect(document.coverage.complete).toBe(false);
    const omitted = document.incidents.reduce((sum, item) => sum + item.omittedFailureEvents, 0);
    expect(omitted).toBeGreaterThan(0);
    const sent = new Set(document.events.map((event) => event.id));
    for (const item of document.incidents) {
      for (const id of item.failureEvents) {
        expect(sent.has(id)).toBe(true);
      }
    }
    for (const link of document.links) {
      expect(sent.has(link.from) && sent.has(link.to)).toBe(true);
    }
  });

  it('sends everything when it fits and says the analysis is complete', () => {
    const analysis = analyzeStructure(bigLog(3, 20));

    const context = buildStructuredContext(analysis, LIMITS);

    expect(context.omittedEvents).toBe(0);
    const document = JSON.parse(context.json) as { coverage: { complete: boolean } };
    expect(document.coverage.complete).toBe(true);
  });
});
