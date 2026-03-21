# Error Monitoring (Sentry)

Client-side and server-side errors are tracked via [Sentry](https://sentry.io).

## Setup

1. Create account at [sentry.io](https://sentry.io)
2. New Project → Next.js → copy the DSN
3. Add to `.env` on the server:

```
SENTRY_DSN=https://...@sentry.io/...
```

4. Restart: `bp-restart`

Alerts are sent by email for every new issue — configurable in the Sentry dashboard under **Alerts**.
