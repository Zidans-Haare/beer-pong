import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Replay nur bei Fehlern aufnehmen (kein ständiges Recording)
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  // Performance Tracing: 10% der Requests tracen
  tracesSampleRate: 0.1,

  // Session Replay: 0% normal, 100% bei Fehler
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 1.0,

  // Nur in Produktion aktiv
  enabled: process.env.NODE_ENV === "production",
});
