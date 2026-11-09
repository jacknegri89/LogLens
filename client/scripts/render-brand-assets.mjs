// Renders the brand images in public/ from their sources, with the Chromium that Playwright
// already installs for the end-to-end tests:
//   og-image.jpg          1200 x 630, the preview shown when a link is shared
//   apple-touch-icon.png  180 x 180, the icon of the iOS home screen
//   icon-192.png, icon-512.png  the icons of the web app manifest
// Run it from the client/ folder with: npm run brand:render
import { chromium } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const publicDir = resolve('public');
const ogSource = pathToFileURL(resolve('brand/og-image.html')).href;
const faviconSvg = readFileSync(resolve(publicDir, 'favicon.svg'), 'utf8');

// An icon that fills its whole square: the home screens round the corners themselves.
const squareIconSvg = faviconSvg.replace('rx="7"', 'rx="0"');

async function renderSquareIcon(browser, sizeInPixels, fileName) {
  const page = await browser.newPage({ viewport: { width: sizeInPixels, height: sizeInPixels } });
  const html = `<body style="margin:0">${squareIconSvg.replace(
    '<svg ',
    `<svg width="${sizeInPixels}" height="${sizeInPixels}" `,
  )}</body>`;
  await page.setContent(html);
  const image = await page.screenshot({ type: 'png' });
  writeFileSync(resolve(publicDir, fileName), image);
  await page.close();
}

async function renderOgImage(browser) {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  await page.goto(ogSource, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const image = await page.screenshot({ type: 'jpeg', quality: 92 });
  writeFileSync(resolve(publicDir, 'og-image.jpg'), image);
  await page.close();
}

// Like the end-to-end tests: the Chrome installed on the machine, or the Chromium that
// `playwright install` downloads when CI is set.
const browserChannel = process.env.CI ? undefined : 'chrome';
const browser = await chromium.launch({ channel: browserChannel });
await renderOgImage(browser);
await renderSquareIcon(browser, 180, 'apple-touch-icon.png');
await renderSquareIcon(browser, 192, 'icon-192.png');
await renderSquareIcon(browser, 512, 'icon-512.png');
await browser.close();

console.log('Brand images written to public/');
