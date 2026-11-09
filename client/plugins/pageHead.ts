import { PAGE_META_TEXT } from '../src/content/pageMeta';
import type { PageKey } from '../src/lib/pageKey';

/**
 * The tags of the <head> that search engines and link previews read WITHOUT running JavaScript:
 * title, description, canonical address, robots and the Open Graph / Twitter card tags.
 * They are written into the HTML of every page when the site is built (see socialPages.ts).
 * The text comes from content/pageMeta.ts, the same table that sets the tab title at runtime.
 */

export const SITE_URL = 'https://loglens-demo.vercel.app';
export const PAGE_HEAD_PLACEHOLDER = '<!--page-head-->';

const SITE_NAME = 'LogLens';
const SOCIAL_IMAGE_URL = `${SITE_URL}/og-image.jpg`;
const SOCIAL_IMAGE_TYPE = 'image/jpeg';
const SOCIAL_IMAGE_WIDTH = '1200';
const SOCIAL_IMAGE_HEIGHT = '630';
const SOCIAL_IMAGE_ALT =
  'LogLens: Find the line that broke. A log sheet with the failing line highlighted under a magnifying glass.';

export interface PageFile {
  key: PageKey;
  /** The file written in dist/. The hosting maps the address of the page to it. */
  fileName: string;
  /** The public address of a page that may appear in search results. null = private page. */
  canonicalPath: string | null;
}

/**
 * Private pages (history, one analysis, a shared report) and the 404 page are not indexed and
 * carry no canonical address and no og:url: a shared-report address holds a secret token that
 * must not be copied into the metadata.
 */
export const PAGE_FILES: PageFile[] = [
  { key: 'home', fileName: 'index.html', canonicalPath: '/' },
  { key: 'workbench', fileName: 'workbench.html', canonicalPath: '/workbench' },
  { key: 'privacy', fileName: 'privacy.html', canonicalPath: '/privacy' },
  { key: 'history', fileName: 'history.html', canonicalPath: null },
  { key: 'analysis', fileName: 'analysis.html', canonicalPath: null },
  { key: 'shared', fileName: 'shared.html', canonicalPath: null },
  { key: 'notFound', fileName: '404.html', canonicalPath: null },
];

export const HOME_PAGE: PageFile = PAGE_FILES[0];

/** Makes a text safe inside an HTML attribute or element. */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function nameTag(name: string, content: string): string {
  return `<meta name="${name}" content="${escapeHtml(content)}" />`;
}

function propertyTag(property: string, content: string): string {
  return `<meta property="${property}" content="${escapeHtml(content)}" />`;
}

/** All the head tags of one page, one per line. */
export function renderPageHead(page: PageFile): string {
  const meta = PAGE_META_TEXT.en[page.key];
  const tags: string[] = [];

  tags.push(`<title>${escapeHtml(meta.title)}</title>`);
  tags.push(nameTag('description', meta.description));

  if (page.canonicalPath === null) {
    tags.push(nameTag('robots', 'noindex, nofollow'));
  } else {
    const pageUrl = `${SITE_URL}${page.canonicalPath}`;
    tags.push(`<link rel="canonical" href="${pageUrl}" />`);
    tags.push(propertyTag('og:url', pageUrl));
  }

  tags.push(propertyTag('og:type', 'website'));
  tags.push(propertyTag('og:site_name', SITE_NAME));
  tags.push(propertyTag('og:title', meta.title));
  tags.push(propertyTag('og:description', meta.description));
  tags.push(propertyTag('og:locale', 'en_US'));
  tags.push(propertyTag('og:locale:alternate', 'it_IT'));
  tags.push(propertyTag('og:image', SOCIAL_IMAGE_URL));
  tags.push(propertyTag('og:image:secure_url', SOCIAL_IMAGE_URL));
  tags.push(propertyTag('og:image:type', SOCIAL_IMAGE_TYPE));
  tags.push(propertyTag('og:image:width', SOCIAL_IMAGE_WIDTH));
  tags.push(propertyTag('og:image:height', SOCIAL_IMAGE_HEIGHT));
  tags.push(propertyTag('og:image:alt', SOCIAL_IMAGE_ALT));

  tags.push(nameTag('twitter:card', 'summary_large_image'));
  tags.push(nameTag('twitter:title', meta.title));
  tags.push(nameTag('twitter:description', meta.description));
  tags.push(nameTag('twitter:image', SOCIAL_IMAGE_URL));
  tags.push(nameTag('twitter:image:alt', SOCIAL_IMAGE_ALT));

  return tags.join('\n    ');
}

/** Puts the head tags of a page where the template has the placeholder. */
export function fillTemplate(template: string, page: PageFile): string {
  if (!template.includes(PAGE_HEAD_PLACEHOLDER)) {
    throw new Error(`index.html has no ${PAGE_HEAD_PLACEHOLDER} placeholder.`);
  }
  return template.replace(PAGE_HEAD_PLACEHOLDER, () => renderPageHead(page));
}
