import { lazy, Suspense, type ReactNode } from 'react';
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
        <Route
          path="/"
          element={
            <PageSuspense>
              <AnalyzePage />
            </PageSuspense>
          }
        />
        <Route
          path="/history"
          element={
            <PageSuspense>
              <HistoryPage />
            </PageSuspense>
          }
        />
        <Route
          path="/analyses/:id"
          element={
            <PageSuspense>
              <AnalysisDetailPage />
            </PageSuspense>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

/** Pages load on demand; nothing is shown while their code arrives. */
function PageSuspense({ children }: { children: ReactNode }) {
  return <Suspense fallback={null}>{children}</Suspense>;
}
