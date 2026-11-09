import { describe, expect, it } from 'vitest';

import { PAGE_META_TEXT } from '../src/content/pageMeta';
import {
  escapeHtml,
  fillTemplate,
  PAGE_FILES,
  PAGE_HEAD_PLACEHOLDER,
  renderPageHead,
  SITE_URL,
} from './pageHead';

/** The tag names ("og:title", "description", "canonical"...) found in a block of head tags. */
function tagKeys(head: string): string[] {
  const keys: string[] = [];
  for (const match of head.matchAll(/<(?:meta (?:name|property)|link rel)="([^"]+)"/g)) {
    keys.push(match[1]);
  }
  if (head.includes('<title>')) {
    keys.push('title');
  }
  return keys;
}

describe('renderPageHead', () => {
  it('has every tag a link preview needs, once', () => {
    const head = renderPageHead(PAGE_FILES[0]);
    const keys = tagKeys(head);

    for (const required of [
      'title',
      'description',
      'canonical',
      'og:type',
      'og:site_name',
      'og:title',
      'og:description',
      'og:url',
      'og:image',
      'og:image:secure_url',
      'og:image:width',
      'og:image:height',
      'og:image:alt',
      'og:locale',
      'twitter:card',
      'twitter:title',
      'twitter:description',
      'twitter:image',
    ]) {
      expect(keys, required).toContain(required);
    }
    expect(head).toContain('content="summary_large_image"');
  });

  it('never repeats a tag, so two values can not contradict each other', () => {
    for (const page of PAGE_FILES) {
      const keys = tagKeys(renderPageHead(page)).filter((key) => key !== 'og:locale:alternate');
      expect(new Set(keys).size, page.fileName).toBe(keys.length);
    }
  });

  it('uses absolute https addresses for the image and the page', () => {
    for (const page of PAGE_FILES) {
      const head = renderPageHead(page);
      const addresses = [...head.matchAll(/(?:content|href)="(https?:[^"]+)"/g)].map(
        (match) => match[1],
      );
      for (const address of addresses) {
        expect(address.startsWith(`${SITE_URL}/`), `${page.fileName}: ${address}`).toBe(true);
      }
    }
    expect(renderPageHead(PAGE_FILES[0])).toContain(`content="${SITE_URL}/og-image.jpg"`);
  });

  it('writes the title and description of the page, taken from the content table', () => {
    for (const page of PAGE_FILES) {
      const meta = PAGE_META_TEXT.en[page.key];
      const head = renderPageHead(page);
      expect(head).toContain(`<title>${escapeHtml(meta.title)}</title>`);
      expect(head).toContain(`name="description" content="${escapeHtml(meta.description)}"`);
    }
  });

  it('keeps private pages out of the index and out of the metadata addresses', () => {
    const privatePages = PAGE_FILES.filter((page) => page.canonicalPath === null);
    expect(privatePages.map((page) => page.key).sort()).toEqual([
      'analysis',
      'history',
      'notFound',
      'shared',
    ]);

    for (const page of privatePages) {
      const head = renderPageHead(page);
      expect(head, page.fileName).toContain('content="noindex, nofollow"');
      expect(head, page.fileName).not.toContain('rel="canonical"');
      expect(head, page.fileName).not.toContain('og:url');
    }
  });

  it('lets the public pages be indexed, each with its own canonical address', () => {
    const publicPages = PAGE_FILES.filter((page) => page.canonicalPath !== null);
    expect(publicPages.map((page) => page.canonicalPath)).toEqual(['/', '/workbench', '/privacy']);

    for (const page of publicPages) {
      const head = renderPageHead(page);
      expect(head).not.toContain('noindex');
      expect(head).toContain(`<link rel="canonical" href="${SITE_URL}${page.canonicalPath}" />`);
    }
  });
});

describe('page descriptions', () => {
  // Link previews on a phone cut the description at about 125 characters.
  const MAX_DESCRIPTION_LENGTH = 125;

  it.each(['en', 'it'] as const)('stay short enough to read in full (%s)', (language) => {
    for (const [pageKey, meta] of Object.entries(PAGE_META_TEXT[language])) {
      expect(meta.description.length, `${language} ${pageKey}`).toBeLessThanOrEqual(
        MAX_DESCRIPTION_LENGTH,
      );
    }
  });
});

describe('fillTemplate', () => {
  it('replaces the placeholder and keeps the rest of the page', () => {
    const html = `<head>${PAGE_HEAD_PLACEHOLDER}<link rel="icon" href="/a.svg" /></head>`;
    const filled = fillTemplate(html, PAGE_FILES[0]);

    expect(filled).toContain('<title>');
    expect(filled).toContain('<link rel="icon" href="/a.svg" />');
    expect(filled).not.toContain(PAGE_HEAD_PLACEHOLDER);
  });

  it('fails loudly when the template lost its placeholder', () => {
    expect(() => fillTemplate('<head></head>', PAGE_FILES[0])).toThrow(/placeholder/);
  });

  it('does not read "$&" in a title as a replacement pattern', () => {
    const filled = fillTemplate(`<head>${PAGE_HEAD_PLACEHOLDER}</head>`, PAGE_FILES[0]);
    expect(filled.startsWith('<head><title>')).toBe(true);
  });
});

describe('escapeHtml', () => {
  it('escapes the characters that could close an attribute', () => {
    expect(escapeHtml('a "b" <c> & d')).toBe('a &quot;b&quot; &lt;c&gt; &amp; d');
  });
});
