/** The UTF-8 size of a text in bytes, without building an encoded copy of a large log. */
export function utf8ByteLength(text: string): number {
  let bytes = 0;
  for (let position = 0; position < text.length; position += 1) {
    const code = text.charCodeAt(position);
    if (code < 0x80) {
      bytes += 1;
    } else if (code < 0x800) {
      bytes += 2;
    } else if (code >= 0xd800 && code <= 0xdbff && position + 1 < text.length) {
      // A surrogate pair is one character of four bytes.
      bytes += 4;
      position += 1;
    } else {
      bytes += 3;
    }
  }
  return bytes;
}
