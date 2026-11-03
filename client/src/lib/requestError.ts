/**
 * A failed HTTP request. `message` is what the server said and is empty when it said nothing,
 * so the page can write its own sentence in the page language.
 */
export class RequestError extends Error {
  readonly status: number;

  constructor(status: number, message = '') {
    super(message);
    this.name = 'RequestError';
    this.status = status;
  }
}
