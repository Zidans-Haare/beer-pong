const { runShell } = require('../utils/shell');
const { nvmPrefix } = require('../utils/nvm');
const path = require('path');
const fs = require('fs');
const os = require('os');

/**
 * Builds the app and sets up the PM2 process.
 * Loads .env before build so NEXT_PUBLIC_* vars are baked in correctly.
 */
function setupPm2(answers, spinner) {
    const { appPath, port } = answers;
    const nvm = nvmPrefix();
    const dbPath = path.join(appPath, 'prisma', 'dev.db');
    const serverScript = path.join(appPath, '.next', 'standalone', 'server.js');
    const pm2Name = 'beer-pong';
    const user = os.userInfo().username;
    const home = os.homedir();

    // Source .env so NEXT_PUBLIC_* vars are available during build
    const envPath = path.join(appPath, '.env');
    const envExport = fs.existsSync(envPath)
        ? `set -a; . "${envPath}"; set +a; `
        : '';

    spinner.text = 'Installing dependencies (npm ci)…';
    runShell(`cd "${appPath}"; ${nvm}npm ci`);

    spinner.text = 'Building app (npm run build)…';
    runShell(`cd "${appPath}"; ${nvm}${envExport}npm run build`);

    // Remove maintenance files that may have been copied into standalone
    runShell(`rm -f "${appPath}/.next/standalone/public/maintenance.on" "${appPath}/.next/standalone/public/maintenance-msg.txt" 2>/dev/null || true`);

    spinner.text = 'Setting up PM2…';
    let pm2Running = false;
    try {
        runShell(`${nvm}pm2 show ${pm2Name}`);
        pm2Running = true;
    } catch { /* process doesn't exist yet */ }

    if (pm2Running) {
        runShell(`${nvm}DATABASE_URL="file:${dbPath}" PORT=${port} pm2 restart ${pm2Name} --update-env`);
    } else {
        runShell(`${nvm}DATABASE_URL="file:${dbPath}" PORT=${port} pm2 start "${serverScript}" --name ${pm2Name}`);
    }

    runShell(`${nvm}pm2 save`);

    spinner.text = 'Setting up PM2 autostart…';
    try {
        const startupOutput = runShell(`${nvm}pm2 startup systemd -u ${user} --hp ${home}`);
        const sudoLine = startupOutput.split('\n').find(l => l.trim().startsWith('sudo'));
        if (sudoLine) {
            try {
                runShell(sudoLine.trim());
            } catch {
                spinner.warn('Could not run PM2 startup command automatically.');
                spinner.warn('Run manually: ' + sudoLine.trim());
            }
        }
    } catch {
        spinner.warn('PM2 autostart could not be configured — please set up manually.');
    }
}

module.exports = { setupPm2 };
