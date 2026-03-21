# Email Notifications

Emails are sent via [Resend](https://resend.com). Requires a verified sending domain.

## Triggered Events

| Event | Recipient |
|---|---|
| Account approved by admin | Registered user |

## Setup

1. Create account at [resend.com](https://resend.com)
2. Add your domain → copy SPF/DKIM records into your DNS registrar
3. Create API key with **Sending access**
4. Add to `.env`:

```
RESEND_API_KEY=re_...
APP_URL=https://your-domain.com
```

5. Restart: `bp-restart`

Email sending is non-blocking — a failed delivery won't interrupt the admin action, but will be logged to the console.
