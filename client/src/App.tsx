import { Route, Routes } from 'react-router-dom';

import { Layout } from './components/Layout';
import { AnalysisDetailPage } from './pages/AnalysisDetailPage';
import { AnalyzePage } from './pages/AnalyzePage';
import { HistoryPage } from './pages/HistoryPage';

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<AnalyzePage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/analyses/:id" element={<AnalysisDetailPage />} />
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
