import { describe, expect, it } from 'vitest';

import { extractLineFields } from './lineFields';

describe('extractLineFields', () => {
  it('reads time, level, address, hex code and event id from one line', () => {
    const fields = extractLineFields(
      '2026-11-03T10:00:01Z ERROR gateway 10.0.0.5:8443 failed, EventID=4625 status 0xC000006D',
    );

    expect(fields).toEqual([
      'time 2026-11-03T10:00:01Z',
      'level ERROR',
      'address 10.0.0.5:8443',
      'hex code 0xC000006D',
      'event id EventID=4625',
    ]);
  });

  it('reads a syslog time stamp', () => {
    expect(extractLineFields('Nov  3 10:00:01 host sshd[12]: boom')).toContain(
      'time Nov  3 10:00:01',
    );
  });

  it('returns nothing for a line without measurable fields', () => {
    expect(extractLineFields('the kitchen is on fire')).toEqual([]);
  });
});
