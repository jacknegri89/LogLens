import '@fontsource-variable/archivo/wdth.css';
import '@fontsource/courier-prime/400.css';
import '@fontsource/courier-prime/700.css';
import { Analytics } from '@vercel/analytics/react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import { App } from './App';
import { redactSharedLinks } from './lib/analyticsPrivacy';
import { LanguageProvider } from './i18n/LanguageProvider';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element #root not found');
}

createRoot(rootElement).render(
  <StrictMode>
    <LanguageProvider>
      <BrowserRouter>
        <App />
        <Analytics beforeSend={redactSharedLinks} />
      </BrowserRouter>
    </LanguageProvider>
  </StrictMode>,
);
