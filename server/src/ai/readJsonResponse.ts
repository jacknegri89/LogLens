import { AppError } from '../middleware/errorHandler';

const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;

/** Read a bounded provider response before parsing untrusted JSON. */
export async function readJsonResponse(response: Response): Promise<unknown> {
  if (!response.body) {
    throw new AppError(502, 'The AI service returned an empty response.');
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let receivedBytes = 0;
  let text = '';
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      receivedBytes += value.byteLength;
      if (receivedBytes > MAX_RESPONSE_BYTES) {
        throw new AppError(502, 'The AI service response is too large.');
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
  } finally {
    await reader.cancel().catch(() => undefined);
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new AppError(502, 'The AI service returned invalid JSON.');
  }
}
