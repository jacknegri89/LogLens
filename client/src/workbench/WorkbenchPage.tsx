import { Suspense, useEffect, useRef } from 'react';

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
import '../styles/workbench-shell.css';

/** The Workbench: load a log once, then work on it from many views. */
export function WorkbenchPage() {
  const { activeTab } = useWorkbench();
  const text = useText(WORKBENCH_TEXT);
  const ActivePanel = TAB_PANELS[activeTab];

  return (
    <div className="pt-6">
      <h1 className="workbench-title">{text.title}</h1>
      <p className="mt-4 max-w-3xl text-lg leading-relaxed text-chalk">{text.intro}</p>
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
  let analyzeLabel = text.analyze;
  if (loading) {
    analyzeLabel = text.analyzing;
  }

  return (
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={analyze}
        disabled={rawLog.trim() === '' || loading}
        className="btn-ink px-6 py-2.5 text-sm font-bold tracking-wide uppercase disabled:cursor-not-allowed disabled:opacity-40"
      >
        {analyzeLabel}
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
  const tabListRef = useRef<HTMLDivElement>(null);

  // On a phone the tabs scroll sideways. Centre the open tab inside that row only: scrolling the
  // page itself here would jump the visitor down the page on every change.
  useEffect(() => {
    const tabList = tabListRef.current;
    const openTab = tabList?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!tabList || !openTab) {
      return;
    }
    const tabCentre = openTab.offsetLeft + openTab.offsetWidth / 2;
    tabList.scrollLeft = tabCentre - tabList.clientWidth / 2;
  }, [activeTab]);

  return (
    <div
      ref={tabListRef}
      role="tablist"
      aria-label={text.tabsLabel}
      className="workbench-tabs mt-6"
    >
      {WORKBENCH_TAB_IDS.map((tab) => (
        <button
          key={tab}
          type="button"
          role="tab"
          aria-selected={tab === activeTab}
          aria-controls={`workbench-panel-${tab}`}
          onClick={() => setActiveTab(tab)}
          className="workbench-tab"
        >
          {text.tabs[tab]}
        </button>
      ))}
    </div>
  );
}
