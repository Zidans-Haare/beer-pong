# CI/CD

## GitHub Webhook (Auto-Deploy)

Every push to `main` can automatically trigger a deploy on your server via the `/api/deploy` webhook endpoint.

**Setup in GitHub:**
1. Go to your repo → **Settings → Webhooks → Add webhook**
2. Payload URL: `https://your-domain.com/api/deploy`
3. Content type: `application/json`
4. Secret: value of `DEPLOY_SECRET` from your `.env`
5. Event: **Just the push event**

The webhook triggers `scripts/update.sh` on the server — same as `bp-update`.

---

## GitHub Actions

Three automated workflows run on every push to `main`:

### 1. Deploy (`deploy.yml`)

Runs tests, then deploys via SSH.

**Test job:**
- Unit tests (`npm test`)
- E2E tests via Playwright (non-blocking)

**Deploy job:**
- Activates maintenance page
- Creates rollback backup of `.next/standalone`
- Runs `npm ci`, `prisma generate`, `prisma migrate deploy`
- Builds the app and restarts PM2
- On failure: restores previous build automatically

**Required GitHub Secrets:**

| Secret | Description |
|---|---|
| `SSH_HOST` | Server IP or hostname |
| `SSH_USER` | SSH username |
| `SSH_PRIVATE_KEY` | Private SSH key |
| `E2E_USER_EMAIL` | Playwright test account email |
| `E2E_USER_PASSWORD` | Playwright test account password |
| `LHCI_TOKEN` | Lighthouse CI project token |
| `E2E_BASE_URL` | Production URL for E2E tests |

### 2. Nightly Smoke-Test (`smoke-test.yml`)

Runs every night at 3:00 UTC against production. Uploads a Playwright report as artifact on failure. Can also be triggered manually.

### 3. Lighthouse CI (`lighthouse.yml`)

Runs after every deploy. Tests performance, accessibility, best practices, and PWA score. Performance budgets are defined in `.github/lighthouse-budget.json`.
