import { describe, expect, it } from 'vitest';

import indexHtml from '../index.html?raw';
import appleTouchIcon from '../public/apple-touch-icon.png?inline';
import icon192 from '../public/icon-192.png?inline';
import icon512 from '../public/icon-512.png?inline';
import ogImage from '../public/og-image.jpg?inline';
import manifestText from '../public/site.webmanifest?raw';

/** The bytes of an image that Vite gives as a base64 "data:" address. */
function bytesOf(dataUrl: string): Uint8Array {
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
  return Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
}

/** Width and height written in the header of a PNG (always right after the 8-byte signature). */
function pngSize(bytes: Uint8Array): { width: number; height: number } {
  const view = new DataView(bytes.buffer);
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

/** Width and height of a JPEG, read from its first "start of frame" marker. */
function jpegSize(bytes: Uint8Array): { width: number; height: number } {
  const view = new DataView(bytes.buffer);
  let position = 2;
  while (position < bytes.length) {
    const marker = bytes[position + 1];
    const isStartOfFrame = marker >= 0xc0 && marker <= 0xc3;
    if (isStartOfFrame) {
      return { height: view.getUint16(position + 5), width: view.getUint16(position + 7) };
    }
    position += 2 + view.getUint16(position + 2);
  }
  throw new Error('No start-of-frame marker found in the JPEG.');
}

const MAX_SOCIAL_IMAGE_BYTES = 300 * 1024;

describe('the social preview image', () => {
  const bytes = bytesOf(ogImage);

  it('is a JPEG of 1200 x 630 pixels', () => {
    expect([bytes[0], bytes[1]]).toEqual([0xff, 0xd8]);
    expect(jpegSize(bytes)).toEqual({ width: 1200, height: 630 });
  });

  it('is light enough for every app to show the large card', () => {
    expect(bytes.length).toBeLessThan(MAX_SOCIAL_IMAGE_BYTES);
  });
});

describe('the icons', () => {
  it.each([
    ['apple-touch-icon.png', appleTouchIcon, 180],
    ['icon-192.png', icon192, 192],
    ['icon-512.png', icon512, 512],
  ])('%s is a square PNG of the declared size', (_name, dataUrl, size) => {
    expect(pngSize(bytesOf(dataUrl))).toEqual({ width: size, height: size });
  });

  it('are the ones the web app manifest declares', () => {
    const manifest = JSON.parse(manifestText) as {
      icons: { src: string; sizes: string; type: string }[];
      theme_color: string;
    };

    expect(manifest.icons.map((icon) => `${icon.src} ${icon.sizes}`)).toEqual([
      '/icon-192.png 192x192',
      '/icon-512.png 512x512',
    ]);
    expect(indexHtml).toContain(`content="${manifest.theme_color}"`);
  });
});

describe('index.html', () => {
  it('links the icons and the manifest, and leaves the preview tags to the build', () => {
    expect(indexHtml).toContain('rel="icon" type="image/svg+xml" href="/favicon.svg"');
    expect(indexHtml).toContain('rel="apple-touch-icon" href="/apple-touch-icon.png"');
    expect(indexHtml).toContain('rel="manifest" href="/site.webmanifest"');
    expect(indexHtml).toContain('<!--page-head-->');
  });

  it('does not write preview tags by hand, which would repeat the generated ones', () => {
    expect(indexHtml).not.toContain('og:title');
    expect(indexHtml).not.toContain('<title>');
    expect(indexHtml).not.toContain('name="description"');
  });

  it('loads nothing from another site', () => {
    expect(indexHtml).not.toMatch(/(?:href|src)="https?:\/\/(?!www\.)/);
  });
});
