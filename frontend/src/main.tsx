import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import { initSentry } from './sentry';
import './index.css';

void initSentry(import.meta.env.VITE_SENTRY_DSN);

const IS_LOCALHOST = ['localhost', '127.0.0.1', '::1', ''].includes(window.location.hostname);

if ('serviceWorker' in navigator && IS_LOCALHOST) {
  void navigator.serviceWorker.getRegistrations().then((regs) => {
    regs.forEach((reg) => void reg.unregister());
  });
  if ('caches' in window) {
    void caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key))));
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);

if ('serviceWorker' in navigator && import.meta.env.PROD && !IS_LOCALHOST) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).catch(() => {});

    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data?.type === 'SW_UPDATE') {
        navigator.serviceWorker.controller?.postMessage({ type: 'SKIP_WAITING' });
      }
    });

    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });
  });
}
