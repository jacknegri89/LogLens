import { describe, expect, it } from 'vitest';

import {
  addMessage,
  appendToken,
  MAX_ANSWER_CHARACTERS,
  MAX_MESSAGES,
  patchMessage,
  type ChatMessage,
} from './chatMessages';

const message = (id: number, text = ''): ChatMessage => ({ id, role: 'assistant', text });

describe('addMessage', () => {
  it('adds at the end without changing the old list', () => {
    const original = [message(1)];
    const next = addMessage(original, message(2));
    expect(next.map((entry) => entry.id)).toEqual([1, 2]);
    expect(original).toHaveLength(1);
  });

  it('drops the oldest messages beyond the limit', () => {
    let list: ChatMessage[] = [];
    for (let id = 1; id <= MAX_MESSAGES + 5; id++) {
      list = addMessage(list, message(id));
    }
    expect(list).toHaveLength(MAX_MESSAGES);
    expect(list[0].id).toBe(6);
  });
});

describe('patchMessage', () => {
  it('changes only the message with that id', () => {
    const list = patchMessage([message(1), message(2)], 2, { status: 'done' });
    expect(list[0].status).toBeUndefined();
    expect(list[1].status).toBe('done');
  });

  it('leaves the list as it is when the id is unknown', () => {
    expect(patchMessage([message(1)], 9, { status: 'failed' })).toEqual([message(1)]);
  });
});

describe('appendToken', () => {
  it('adds text to the message with that id', () => {
    const list = appendToken(appendToken([message(1), message(2)], 2, 'Hel'), 2, 'lo');
    expect(list[1].text).toBe('Hello');
    expect(list[0].text).toBe('');
  });

  it('stops growing at the answer limit', () => {
    const list = appendToken([message(1, 'x'.repeat(MAX_ANSWER_CHARACTERS - 2))], 1, 'abcdef');
    expect(list[0].text).toHaveLength(MAX_ANSWER_CHARACTERS);
    expect(list[0].text.endsWith('xab')).toBe(true);
  });
});
