import { describe, expect, it } from 'vitest';

import { BOARD_MAX_CARDS, boardEntriesFrom } from './incidentBoard';
import { threadLinks } from './thread';
import type { Incident } from './types';

function incident(id: string, withCause: boolean, symptoms: number): Incident {
  const timeline: Incident['timeline'] = [];
  if (withCause) {
    timeline.push({
      eventId: `${id}-c`,
      lineStart: 1,
      title: 'change',
      role: 'cause',
      time: '2026-11-04T10:02:04.000Z',
    });
  }
  for (let index = 0; index < symptoms; index += 1) {
    timeline.push({
      eventId: `${id}-s${index}`,
      lineStart: 2 + index,
      title: `failure ${index}`,
      role: 'symptom',
    });
  }
  return {
    id,
    title: id,
    category: 'Timeout',
    severity: 'medium',
    severityReasons: [],
    description: '',
    rootCause: {
      status: 'probable',
      kind: 'change',
      summary: '',
      evidence: [],
      contradicting: [],
      alternatives: [],
    },
    confidence: { level: 'low', criteria: [] },
    timeline,
    secondarySymptoms: [],
    impact: { observed: [], potential: [], affectedEntities: [], affectedServices: [] },
    immediateActions: [],
    permanentFix: [],
    preventiveMeasures: [],
  };
}

describe('boardEntriesFrom', () => {
  it('puts the cause first and points each effect at it', () => {
    const board = boardEntriesFrom([incident('I1', true, 3)]);
    expect(board.map((entry) => entry.role)).toEqual(['root', 'effect', 'effect', 'effect']);
    expect(board[0].time).toBe('10:02:04');
    expect(threadLinks(board)).toHaveLength(3);
  });

  it('keeps the indexes right across incidents', () => {
    const board = boardEntriesFrom([incident('I1', true, 1), incident('I2', true, 1)]);
    expect(board.map((entry) => entry.causedBy)).toEqual([undefined, 0, undefined, 2]);
  });

  it('shows an incident without a cause as unlinked cards', () => {
    const board = boardEntriesFrom([incident('I1', false, 6)]);
    expect(board.every((entry) => entry.role === 'independent')).toBe(true);
    expect(board.length).toBeLessThanOrEqual(3);
  });

  it('never goes past the card limit', () => {
    const many = Array.from({ length: 10 }, (_, index) => incident(`I${index}`, true, 4));
    expect(boardEntriesFrom(many).length).toBeLessThanOrEqual(BOARD_MAX_CARDS);
  });
});
