import { parseLines } from './basicParse';

// Receives the whole log as text and answers with its parsed lines, off the main thread.
self.onmessage = (event: MessageEvent<string>) => {
  self.postMessage(parseLines(event.data));
};
