import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';

import { Layout } from './components/Layout';

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
            <Suspense fallback={null}>
              <AnalyzePage />
            </Suspense>
          }
        />
        <Route
          path="/history"
          element={
            <Suspense fallback={null}>
              <HistoryPage />
            </Suspense>
          }
        />
        <Route
          path="/analyses/:id"
          element={
            <Suspense fallback={null}>
              <AnalysisDetailPage />
            </Suspense>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

function NotFound() {
  return (
    <div className="py-16">
      <p className="font-mono text-lg font-bold text-chalk">404</p>
      <h1 className="mt-2 text-4xl font-extrabold uppercase [font-stretch:125%]">
        This page <span className="marker">does not exist.</span>
      </h1>
    </div>
  );
}
