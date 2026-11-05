import { useContext } from 'react';

import { WorkbenchContext, type WorkbenchState } from './WorkbenchContext';

export function useWorkbench(): WorkbenchState {
  const state = useContext(WorkbenchContext);
  if (!state) {
    throw new Error('useWorkbench needs a WorkbenchProvider above it.');
  }
  return state;
}
