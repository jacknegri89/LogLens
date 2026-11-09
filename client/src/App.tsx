import { lazy, Suspense, type ComponentType } from 'react';
import { Route, Routes } from 'react-router-dom';

import { Layout } from './components/Layout';
import { NotFound } from './components/NotFound';
import { AnalyzePage } from './pages/AnalyzePage';
import { WorkbenchProvider } from './workbench/core/WorkbenchProvider';

const HistoryPage = lazy(() =>
  import('./pages/HistoryPage').then((m) => ({ default: m.HistoryPage })),
);
const WorkbenchPage = lazy(() =>
  import('./workbench/WorkbenchPage').then((m) => ({ default: m.WorkbenchPage })),
);
const AnalysisDetailPage = lazy(() =>
  import('./pages/AnalysisDetailPage').then((m) => ({ default: m.AnalysisDetailPage })),
);
const SharedReportPage = lazy(() =>
  import('./pages/SharedReportPage').then((m) => ({ default: m.SharedReportPage })),
);
const PrivacyPage = lazy(() =>
  import('./pages/PrivacyPage').then((m) => ({ default: m.PrivacyPage })),
);

export function App() {
  return (
    <WorkbenchProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<AnalyzePage />} />
          <Route path="/workbench" element={<Suspended page={WorkbenchPage} />} />
          <Route path="/history" element={<Suspended page={HistoryPage} />} />
          <Route path="/analyses/:id" element={<Suspended page={AnalysisDetailPage} />} />
          <Route path="/shared/:token" element={<Suspended page={SharedReportPage} />} />
          <Route path="/privacy" element={<Suspended page={PrivacyPage} />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </WorkbenchProvider>
  );
}

/**
 * Every page except the home page (the landing page, bundled with the app so it shows at once)
 * loads on demand. While its code arrives an empty block holds the room of the page, so the
 * footer does not jump up and then down again when the page appears (that shift was 0.17 CLS).
 */
function Suspended({ page: Page }: { page: ComponentType }) {
  return (
    <Suspense fallback={<div className="min-h-[70dvh]" aria-hidden="true" />}>
      <Page />
    </Suspense>
  );
}
