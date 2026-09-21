import * as Sentry from '@sentry/react';

export function initSentry(dsn: string | undefined) {
  if (!dsn) return;
  Sentry.init({
    dsn,
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: 0.1,
    environment: import.meta.env.MODE || 'development',
  });
}
