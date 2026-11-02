import { lazy, Suspense, type ComponentType } from 'react';
import { Route, Routes } from 'react-router-dom';

import { Layout } from './components/Layout';
import { NotFound } from './components/NotFound';

const AnalyzePage = lazy(() =>
  import('./pages/AnalyzePage').then((m) => ({ default: m.AnalyzePage })),
);
const HistoryPage = lazy(() =>
  import('./pages/HistoryPage').then((m) => ({ default: m.HistoryPage })),
);
const AnalysisDetailPage = lazy(() =>
  import('./pages/AnalysisDetailPage').then((m) => ({ default: m.AnalysisDetailPage })),
);

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Suspended page={AnalyzePage} />} />
        <Route path="/history" element={<Suspended page={HistoryPage} />} />
        <Route path="/analyses/:id" element={<Suspended page={AnalysisDetailPage} />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
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
