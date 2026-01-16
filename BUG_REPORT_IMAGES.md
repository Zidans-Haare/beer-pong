# Bug Report: Image Loading & Static Asset 404s

**Date:** 2026-01-16
**Status:** Unresolved
**Severity:** High (Affects user profile images and PWA icons)

## Issue Description
Despite a successful build process, the Next.js application fails to serve static assets (from `public/`) and dynamic API routes on the production environment. Requests return `404 Not Found`.

**Symptoms:**
- `curl http://localhost:3000/icon.png` -> 404 (Expected 200)
- `curl http://localhost:3000/api/auth/session` -> 404
- Browser console shows 404 for images.
- `pm2` logs show: `Invariant: The client reference manifest for route "/" does not exist.`

## Attempts & Findings

1.  **Rewrite Rules:** 
    - Attempted to rewrite `/uploads/*` to `/api/custom-uploads/*`.
    - Result: 404 on the API route itself.

2.  **API Handler (`src/app/api/custom-uploads`):**
    - Created a manual file serving handler.
    - Added extensive debug logging.
    - Result: Logs were not generated, implying the request never reached the handler (intercepted by 404 before execution).

3.  **Downgrade:**
    - Downgraded Next.js from `16.1.1` to `15.1.4`.
    - Downgraded `eslint-config-next` to `15.1.4`.
    - Result: Build succeeds, but 404s persist. `Invariant` errors in logs persist.

4.  **Configuration:**
    - Enabled `output: 'standalone'`.
    - Disabled `experimental.serverActions`.
    - Result: No change.

5.  **Middleware:**
    - Temporarily disabled middleware.
    - Result: No change.

## Next Steps / Hypothesis
- **Server Environment:** The node version `v20.19.5` should be compatible, but there might be a conflict with the specific `better-sqlite3` native bindings or the `standalone` output handling in this specific environment.
- **Build Artifacts:** The error "client reference manifest ... does not exist" suggests a corruption in the `.next` build output or a mismatch between what the server expects and what was built.
- **Action Plan:**
    1.  Inspect the `.next/server` directory structure manually.
    2.  Try running `next start` directly without `pm2` to rule out process manager issues.
    3.  Consider a fresh clone in a clean directory to rule out hidden file corruption.
