import { lazy, type ComponentType } from 'react';

import type { WorkbenchTabId } from './types';

/** Each view loads on demand, so the Workbench opens fast and the Analyze page stays light. */
export const TAB_PANELS: Record<WorkbenchTabId, ComponentType> = {
  explorer: lazy(() =>
    import('./explorer/ExplorerPanel').then((module) => ({ default: module.ExplorerPanel })),
  ),
  clusters: lazy(() =>
    import('./clusters/ClustersPanel').then((module) => ({ default: module.ClustersPanel })),
  ),
  traces: lazy(() =>
    import('./traces/TracesPanel').then((module) => ({ default: module.TracesPanel })),
  ),
  lab: lazy(() => import('./lab/LabPanel').then((module) => ({ default: module.LabPanel }))),
  security: lazy(() =>
    import('./security/SecurityPanel').then((module) => ({ default: module.SecurityPanel })),
  ),
  insights: lazy(() =>
    import('./insights/InsightsPanel').then((module) => ({ default: module.InsightsPanel })),
  ),
  fix: lazy(() => import('./fix/FixPanel').then((module) => ({ default: module.FixPanel }))),
  ask: lazy(() => import('./ask/AskPanel').then((module) => ({ default: module.AskPanel }))),
  export: lazy(() =>
    import('./export/ExportPanel').then((module) => ({ default: module.ExportPanel })),
  ),
};
