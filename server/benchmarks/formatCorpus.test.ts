import { describe, expect, it } from 'vitest';

import { analyzeStructure } from '../src/analysis/analyzeStructure';
import { FORMAT_CORPUS } from './fixtures/formatCorpus';

/**
 * Every common log shape must be visible to the analysis: its failures become incidents (with a
 * time when the format has one), its healthy lines do not, and no line of the log is lost.
 */
describe.each(FORMAT_CORPUS.map((sample) => [sample.name, sample] as const))(
  'log format: %s',
  (_name, sample) => {
    const analysis = analyzeStructure(sample.log);
    const inIncident = new Set(analysis.incidents.flatMap((incident) => incident.anomalyEventIds));

    it.each(sample.failures)('turns the failure "%s" into an incident', (marker) => {
      const event = analysis.log.events.find((candidate) => candidate.raw.includes(marker));
      expect(event, `an event containing "${marker}"`).toBeDefined();
      expect(inIncident.has(event?.eventId ?? '')).toBe(true);
      if (sample.hasTime) {
        expect(event?.timestamp).not.toBeNull();
      }
    });

    it.each(sample.healthy)('does not make an incident of "%s"', (marker) => {
      const event = analysis.log.events.find((candidate) => candidate.raw.includes(marker));
      if (event !== undefined) {
        expect(inIncident.has(event.eventId)).toBe(false);
      }
    });

    it('keeps every non-blank line in exactly one event', () => {
      const seen = new Set<number>();
      for (const event of analysis.log.events) {
        for (let line = event.originalLineStart; line <= event.originalLineEnd; line += 1) {
          expect(seen.has(line)).toBe(false);
          seen.add(line);
        }
      }
      sample.log.split('\n').forEach((text, index) => {
        if (text.trim() !== '') {
          expect(seen.has(index + 1)).toBe(true);
        }
      });
    });
  },
);

describe('the corpus itself', () => {
  it('covers at least forty formats with unique names', () => {
    expect(FORMAT_CORPUS.length).toBeGreaterThanOrEqual(40);
    expect(new Set(FORMAT_CORPUS.map((sample) => sample.name)).size).toBe(FORMAT_CORPUS.length);
  });
});

describe('every format in one file', () => {
  function shuffled(seed: number) {
    let state = seed;
    const next = () => {
      state = (state * 1664525 + 1013904223) % 4294967296;
      return state / 4294967296;
    };
    return [...FORMAT_CORPUS].sort(() => next() - 0.5);
  }

  /** Untimed plain lines have no start marker: in a timed file they read as the line before. */
  const UNTIMED_PLAIN = [
    'Server listening',
    'Initializing the backend',
    'is healthy',
    'Memcached started',
  ];

  it.each([0, 1, 2, 3])('finds every failure and almost no false alarm (order %i)', (seed) => {
    let samples = FORMAT_CORPUS;
    if (seed !== 0) {
      samples = shuffled(seed);
    }
    const analysis = analyzeStructure(samples.map((sample) => sample.log).join('\n'));
    const inIncident = new Set(analysis.incidents.flatMap((incident) => incident.anomalyEventIds));
    const hit = (marker: string) => {
      const event = analysis.log.events.find((candidate) => candidate.raw.includes(marker));
      return event !== undefined && inIncident.has(event.eventId);
    };
    const missed = samples.flatMap((sample) => sample.failures).filter((marker) => !hit(marker));
    const falseAlarms = samples
      .flatMap((sample) => sample.healthy)
      .filter((marker) => hit(marker) && !UNTIMED_PLAIN.includes(marker));
    expect(missed).toEqual([]);
    expect(falseAlarms).toEqual([]);
  });
});
