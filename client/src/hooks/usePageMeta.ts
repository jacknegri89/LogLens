import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

import { PAGE_META_TEXT } from '../content/pageMeta';
import { useText } from '../i18n/useText';
import { pageKeyForPath } from '../lib/pageKey';

/** Keeps the tab title and the description of the page in step with the page and the language. */
export function usePageMeta(): void {
  const { pathname } = useLocation();
  const allPages = useText(PAGE_META_TEXT);
  const meta = allPages[pageKeyForPath(pathname)];

  useEffect(() => {
    document.title = meta.title;
    const descriptionTag = document.querySelector('meta[name="description"]');
    if (descriptionTag) {
      descriptionTag.setAttribute('content', meta.description);
    }
  }, [meta]);
}
