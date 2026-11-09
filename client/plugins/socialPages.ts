import type { Plugin } from 'vite';

import { fillTemplate, HOME_PAGE, PAGE_FILES } from './pageHead';

/**
 * A single-page app serves the same index.html for every address, so a crawler that does not run
 * JavaScript would read the tags of the home page everywhere. This plugin fills the head of
 * index.html for the home page and writes one more HTML file per page (workbench.html,
 * privacy.html, shared.html, ...) with that page's own tags. The hosting maps each address to its
 * file (see server/scripts/build-vercel.mjs).
 */
export function socialPages(): Plugin {
  let template = '';

  return {
    name: 'loglens-social-pages',
    enforce: 'post',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        template = html;
        return fillTemplate(html, HOME_PAGE);
      },
    },
    generateBundle() {
      for (const page of PAGE_FILES) {
        if (page === HOME_PAGE) {
          continue;
        }
        this.emitFile({
          type: 'asset',
          fileName: page.fileName,
          source: fillTemplate(template, page),
        });
      }
    },
  };
}
