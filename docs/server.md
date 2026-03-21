# Server Management

## Shell Aliases

After setup, run `source ~/.bashrc` to activate. These commands are then available in every SSH session:

| Command | Description |
|---|---|
| `bp-update` | Pull latest version, rebuild, restart |
| `bp-doctor` | Check installation for issues |
| `bp-doctor-fix` | Check + auto-fix common issues |
| `bp-logs` | Live PM2 log stream |
| `bp-status` | PM2 process status |
| `bp-restart` | Restart the app (reloads `.env`) |
| `bp-maint-on` | Enable maintenance page |
| `bp-maint-off` | Disable maintenance page |

---

## Updating

```bash
bp-update
```

Pulls the latest code, runs migrations, rebuilds, and restarts PM2. The Admin Dashboard shows a banner automatically when a new version is available on GitHub.

---

## Doctor

```bash
bp-doctor        # check only
bp-doctor-fix    # check + auto-fix
```

Checks: app directory, `.env` and required variables, database migrations, Node.js, PM2 status, nginx config, certbot, port response, disk space.

**Auto-fixable issues:**
- Database migrations not applied → runs `prisma migrate deploy` (asks for confirmation)
- PM2 process stopped/crashed → restarts it
- PM2 process not registered → starts it (if build exists)
- App not responding → triggers a PM2 restart
- Disk critically low → cleans journal logs

---

## Maintenance Mode

Zero-downtime maintenance page via nginx flag file — no app restart needed.

```bash
bp-maint-on     # show maintenance page
bp-maint-off    # restore normal operation
```

The maintenance page (`public/maintenance.html`) is fully static and auto-redirects when maintenance ends.

---

## Manual Commands

```bash
# Restart with fresh env vars
set -a; . ~/beer-pong/.env; set +a && pm2 restart beer-pong --update-env

# View logs
pm2 logs beer-pong

# PM2 status
pm2 status
```
