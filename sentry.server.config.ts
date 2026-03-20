import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Performance Tracing: 10% der Server-Requests
  tracesSampleRate: 0.1,

  // Nur in Produktion aktiv
  enabled: process.env.NODE_ENV === "production",
});
