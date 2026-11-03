import { describe, expect, it } from 'vitest';

import { createNdjsonParser, type StreamEvent } from './ndjson';

const TOKEN_LINE = (text: string, done = false) =>
  JSON.stringify({ message: { role: 'assistant', content: text }, done }) + '\n';

function readAll(chunks: string[]): StreamEvent[] {
  const parser = createNdjsonParser();
  return [...chunks.flatMap((chunk) => parser.push(chunk)), ...parser.flush()];
}

describe('createNdjsonParser', () => {
  it('reads one token per line', () => {
    expect(readAll([TOKEN_LINE('Hel') + TOKEN_LINE('lo')])).toEqual([
      { type: 'token', text: 'Hel' },
      { type: 'token', text: 'lo' },
    ]);
  });

  it('waits for the rest of a line that arrives in pieces', () => {
    const line = TOKEN_LINE('split me');
    const events = readAll([line.slice(0, 10), line.slice(10, 25), line.slice(25)]);
    expect(events).toEqual([{ type: 'token', text: 'split me' }]);
  });

  it('keeps a partial line unread until it is complete', () => {
    const parser = createNdjsonParser();
    expect(parser.push('{"message":{"content":"par')).toEqual([]);
    expect(parser.push('tial"},"done":false}\n')).toEqual([{ type: 'token', text: 'partial' }]);
  });

  it('reports the done flag after the last token', () => {
    expect(readAll([TOKEN_LINE('end', false), TOKEN_LINE('', true)])).toEqual([
      { type: 'token', text: 'end' },
      { type: 'done' },
    ]);
  });

  it('reads a final line that has no line break when the response ends', () => {
    const lastLine = TOKEN_LINE('x', true).trim();
    expect(readAll([lastLine])).toEqual([{ type: 'token', text: 'x' }, { type: 'done' }]);
  });

  it('turns an error line into an error event', () => {
    expect(readAll(['{"error":"model \\"nope\\" not found"}\n'])).toEqual([
      { type: 'error', message: 'model "nope" not found' },
    ]);
  });

  it('turns a line that is not JSON into an error event', () => {
    expect(readAll(['this is not json\n'])).toEqual([
      { type: 'error', message: 'Malformed line in the response' },
    ]);
  });

  it.each(['[1,2]\n', '"text"\n', '42\n', 'null\n'])('rejects the JSON value %j', (line) => {
    expect(readAll([line])).toEqual([
      { type: 'error', message: 'Unexpected line in the response' },
    ]);
  });

  it('ignores empty lines and lines without content', () => {
    expect(readAll(['\n\n', '{"message":{"content":""},"done":false}\n', '{}\n'])).toEqual([]);
  });

  it('keeps tokens that contain markup as plain text', () => {
    const events = readAll([TOKEN_LINE('<img src=x onerror=alert(1)>')]);
    expect(events).toEqual([{ type: 'token', text: '<img src=x onerror=alert(1)>' }]);
  });

  it('does not repeat events after flush', () => {
    const parser = createNdjsonParser();
    parser.push(TOKEN_LINE('a').trim());
    expect(parser.flush()).toHaveLength(1);
    expect(parser.flush()).toEqual([]);
  });
});
