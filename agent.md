# Agent Instructions & Constraints

This file contains critical instructions for AI agents working on this project.
**STRICT ADHERENCE IS REQUIRED.**

## CRITICAL NO-GOs (NEVER DO THIS)

1.  **NEVER OVERWRITE OR DELETE THE DATABASE (`dev.db`).**
    - The `dev.db` file contains PRODUCTION DATA for a live user group.
    - **NEVER** run commands that reset, purge, or overwrite the database file (e.g., `rm dev.db`, `prisma migrate reset`).
    - **NEVER** run `prisma db seed` on the production server unless explicitly requested to fix specific data.

2.  **NEVER USE `prisma db push`.**
    - **ALWAYS** use `npx prisma migrate deploy` to apply schema changes on this server.
    - `db push` can cause immediate data loss if there are schema conflicts.

3.  **DO NOT REVERT CONFIGURATION WITHOUT CHECKING.**
    - `next.config.ts`, `package.json`, and environment variables are set up for a specific production environment.

## Operational Guidelines

-   **Environment:** Treat this current environment as **PRODUCTION**.
-   **Migrations:** When schema changes are needed:
    1.  Create the migration locally or in a dev environment (`migrate dev`).
    2.  Pull the changes here.
    3.  Run `npx prisma migrate deploy`.
-   **Data Safety:** Prioritize data preservation above all else. If a command involves risk to `dev.db`, STOP and ask for confirmation.
