import { Suspense } from 'react';

import { WORKBENCH_TEXT } from '../content/workbench';
import { useText } from '../i18n/useText';
import { LogLoader } from './explorer/LogLoader';
import { PermalinkRestoreNotice } from './export/PermalinkRestoreNotice';
import { LineInspector } from './inspector/LineInspector';
import { LiveTailControl } from './lab/LiveTailControl';
import { ScrubButton } from './security/ScrubButton';
import { TAB_PANELS } from './tabs';
import { useWorkbench } from './core/useWorkbench';
import { WORKBENCH_TAB_IDS } from './types';

/** The Workbench: load a log once, then work on it from many views. */
export function WorkbenchPage() {
  const { activeTab } = useWorkbench();
  const text = useText(WORKBENCH_TEXT);
  const ActivePanel = TAB_PANELS[activeTab];

  return (
    <div className="pt-6">
      <h1 className="text-4xl font-black tracking-tight uppercase">{text.title}</h1>
      <p className="mt-3 max-w-3xl text-chalk">{text.intro}</p>
      <PermalinkRestoreNotice />
      <LogLoader />
      <Toolbar />
      <TabBar />
      <div role="tabpanel" id={`workbench-panel-${activeTab}`} className="mt-4">
        <Suspense fallback={null}>
          <ActivePanel />
        </Suspense>
      </div>
      <LineInspector />
    </div>
  );
}

function Toolbar() {
  const { rawLog, analysis, analyze } = useWorkbench();
  const text = useText(WORKBENCH_TEXT);
  const loading = analysis.status === 'loading';

  return (
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={analyze}
        disabled={rawLog.trim() === '' || loading}
        className="btn-ink px-6 py-2.5 text-sm font-bold tracking-wide uppercase disabled:cursor-not-allowed disabled:opacity-40"
      >
        {loading ? text.analyzing : text.analyze}
      </button>
      <ScrubButton />
      <LiveTailControl />
      {analysis.error && (
        <p role="alert" className="text-sm font-bold text-marker">
          {analysis.error}
        </p>
      )}
    </div>
  );
}

function TabBar() {
  const { activeTab, setActiveTab } = useWorkbench();
  const text = useText(WORKBENCH_TEXT);

  return (
    <div
      role="tablist"
      aria-label={text.tabsLabel}
      className="mt-6 flex flex-wrap gap-1 border-b border-chalk-dim/40"
    >
      {WORKBENCH_TAB_IDS.map((tab) => (
        <button
          key={tab}
          type="button"
          role="tab"
          aria-selected={tab === activeTab}
          aria-controls={`workbench-panel-${tab}`}
          onClick={() => setActiveTab(tab)}
          className={`px-3 py-2 font-mono text-xs font-bold tracking-widest uppercase ${
            tab === activeTab ? 'bg-marker text-ink' : 'text-chalk hover:text-paper'
          }`}
        >
          {text.tabs[tab]}
        </button>
      ))}
    </div>
  );
}
