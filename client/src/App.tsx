import { lazy, Suspense, type ComponentType } from 'react';
import { Route, Routes } from 'react-router-dom';

import { Layout } from './components/Layout';
import { NotFound } from './components/NotFound';
import { WorkbenchProvider } from './workbench/core/WorkbenchProvider';

const AnalyzePage = lazy(() =>
  import('./pages/AnalyzePage').then((m) => ({ default: m.AnalyzePage })),
);
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

export function App() {
  return (
    <WorkbenchProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Suspended page={AnalyzePage} />} />
          <Route path="/workbench" element={<Suspended page={WorkbenchPage} />} />
          <Route path="/history" element={<Suspended page={HistoryPage} />} />
          <Route path="/analyses/:id" element={<Suspended page={AnalysisDetailPage} />} />
          <Route path="/shared/:token" element={<Suspended page={SharedReportPage} />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </WorkbenchProvider>
  );
}

/** Pages load on demand; nothing is shown while their code arrives. */
function Suspended({ page: Page }: { page: ComponentType }) {
  return (
    <Suspense fallback={null}>
      <Page />
    </Suspense>
  );
}
