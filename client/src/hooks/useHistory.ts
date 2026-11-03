import { useState } from 'react';

import { api } from '../lib/api';
import { useLoad } from './useLoad';

/** Loads the history and hides the analyses the visitor removed, without asking the server again. */
export function useHistory(loadFallback: string) {
  // Bumping this key loads the history again, for example after it was cleared.
  const [reloadKey, setReloadKey] = useState(0);
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const { data, error } = useLoad(() => api.listAnalyses(), [reloadKey], loadFallback);

  return {
    items: data ? data.items.filter((item) => !removedIds.includes(item.id)) : null,
    offline: data?.offline ?? false,
    error,
    reload: () => setReloadKey((key) => key + 1),
    forget: (id: string) => setRemovedIds((ids) => [...ids, id]),
  };
}
