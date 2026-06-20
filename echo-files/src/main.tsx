import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { useGameStore } from './store/gameStore';
import './index.css';

// ── E2E Test Bridge: expose Zustand store on window for Playwright ──
// Only in development mode
if (import.meta.env.DEV) {
  (window as any).__ECHO_STORE__ = useGameStore;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
