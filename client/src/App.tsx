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
        <Route path="/" element={<Suspense fallback={null}><AnalyzePage /></Suspense>} />
        <Route path="/history" element={<Suspense fallback={null}><HistoryPage /></Suspense>} />
        <Route path="/analyses/:id" element={<Suspense fallback={null}><AnalysisDetailPage /></Suspense>} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

function NotFound() {
  return (
    <div className="py-24 text-center">
      <p className="font-mono text-sm text-fg-faint">404 — page not found</p>
    </div>
  );
}
