export type StreamEvent =
  { type: 'token'; text: string } | { type: 'done' } | { type: 'error'; message: string };

export interface NdjsonParser {
  /** Adds a piece of the response; returns the events of the lines it completed. */
  push: (chunk: string) => StreamEvent[];
  /** Reads what is left once the response has ended (a last line without a line break). */
  flush: () => StreamEvent[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function eventsOfLine(line: string): StreamEvent[] {
  let data: unknown;
  try {
    data = JSON.parse(line);
  } catch {
    return [{ type: 'error', message: 'Malformed line in the response' }];
  }
  if (!isRecord(data)) {
    return [{ type: 'error', message: 'Unexpected line in the response' }];
  }
  if (typeof data.error === 'string') {
    return [{ type: 'error', message: data.error }];
  }
  const events: StreamEvent[] = [];
  let content: unknown;
  if (isRecord(data.message)) {
    content = data.message.content;
  }
  if (typeof content === 'string' && content !== '') {
    events.push({ type: 'token', text: content });
  }
  if (data.done === true) {
    events.push({ type: 'done' });
  }
  return events;
}

function eventsOfLines(lines: string[]): StreamEvent[] {
  return lines.filter((line) => line.trim() !== '').flatMap(eventsOfLine);
}

/** Reads the newline-delimited JSON that Ollama streams from /api/chat, whatever the chunk sizes. */
export function createNdjsonParser(): NdjsonParser {
  let pending = '';
  return {
    push(chunk) {
      const lines = (pending + chunk).split('\n');
      pending = lines.pop() ?? '';
      return eventsOfLines(lines);
    },
    flush() {
      const rest = pending;
      pending = '';
      return eventsOfLines([rest]);
    },
  };
}
