const { runShell, isDryRun } = require('../utils/shell');
const { nvmPrefix } = require('../utils/nvm');
const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');

function dryLog(cmd) { process.stdout.write('\x1b[2m    $ ' + cmd + '\x1b[0m\n'); }

/**
 * Initializes the database: prisma generate + migrate deploy.
 *
 * Local mode: runs prisma directly via the current node process (no bash/NVM needed).
 * Server mode: runs via bash with NVM + sourced .env.
 */
function setupDatabase(answers, spinner) {
    const { appPath, mode } = answers;
    const dbPath = path.join(appPath, 'prisma', 'dev.db');
    const backupsDir = path.join(appPath, 'prisma', 'backups');

    if (!fs.existsSync(backupsDir)) {
        fs.mkdirSync(backupsDir, { recursive: true });
    }

    if (mode === 'local') {
        // Use the current node process directly — no bash or NVM needed
        const env = { ...process.env, DATABASE_URL: `file:${dbPath}` };
        const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';

        spinner.text = 'Running prisma generate…';
        if (isDryRun()) { dryLog(`npx prisma generate  (cwd: ${appPath})`); }
        else { execFileSync(npx, ['prisma', 'generate'], { cwd: appPath, env, stdio: 'pipe' }); }

        spinner.text = 'Running prisma migrate deploy…';
        if (isDryRun()) { dryLog(`npx prisma migrate deploy  (cwd: ${appPath})`); }
        else { execFileSync(npx, ['prisma', 'migrate', 'deploy'], { cwd: appPath, env, stdio: 'pipe' }); }
    } else {
        // Server mode: use bash + NVM + source .env
        const nvm = nvmPrefix();
        const envPath = path.join(appPath, '.env');
        const envExport = fs.existsSync(envPath)
            ? `set -a; . "${envPath}"; set +a; `
            : '';

        // Install deps first — prisma.config.ts requires dotenv and other packages
        spinner.text = 'Installing dependencies (npm ci)…';
        runShell(`cd "${appPath}"; ${nvm}npm ci`);

        spinner.text = 'Running prisma generate…';
        runShell(`cd "${appPath}"; ${nvm}${envExport}npx prisma generate`);

        spinner.text = 'Running prisma migrate deploy…';
        runShell(`cd "${appPath}"; ${nvm}${envExport}npx prisma migrate deploy`);
    }
}

module.exports = { setupDatabase };
