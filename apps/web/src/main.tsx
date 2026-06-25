/**
 * React 18 entry point — mounts the app into the DOM.
 *
 * - `StrictMode` enables React dev warnings (double-invocation of effects, etc.).
 * - `#root` div must exist in `index.html` or we throw.
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import App from './App';
import './index.css';

const rootEl = document.getElementById('root');
if (rootEl === null) {
  throw new Error('Root element #root not found in index.html');
}

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
