const { runShell, commandExists } = require('../utils/shell');
const path = require('path');
const os = require('os');

const NVM_INIT = `export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"`;

/**
 * Builds the app and sets up the PM2 process.
 */
function setupPm2(answers, spinner) {
    const { appPath, port } = answers;
    const dbPath = path.join(appPath, 'prisma', 'dev.db');
    const serverScript = path.join(appPath, '.next', 'standalone', 'server.js');
    const pm2Name = 'beer-pong';
    const user = os.userInfo().username;
    const home = os.homedir();

    spinner.text = 'Installing dependencies (npm ci)…';
    runShell(`cd "${appPath}" && ${NVM_INIT} && npm ci`);

    spinner.text = 'Building app (npm run build)…';
    runShell(`cd "${appPath}" && ${NVM_INIT} && npm run build`);

    // Remove maintenance files that may have been copied into standalone
    runShell(`rm -f "${appPath}/.next/standalone/public/maintenance.on" "${appPath}/.next/standalone/public/maintenance-msg.txt" 2>/dev/null || true`);

    spinner.text = 'Setting up PM2…';
    let pm2Running = false;
    try {
        runShell(`${NVM_INIT} && pm2 show ${pm2Name}`);
        pm2Running = true;
    } catch { /* process doesn't exist yet */ }

    if (pm2Running) {
        runShell(`${NVM_INIT} && DATABASE_URL="file:${dbPath}" PORT=${port} pm2 restart ${pm2Name} --update-env`);
    } else {
        runShell(
            `${NVM_INIT} && DATABASE_URL="file:${dbPath}" PORT=${port} ` +
            `pm2 start "${serverScript}" --name ${pm2Name}`
        );
    }

    runShell(`${NVM_INIT} && pm2 save`);

    spinner.text = 'Setting up PM2 autostart…';
    try {
        const startupOutput = runShell(`${NVM_INIT} && pm2 startup systemd -u ${user} --hp ${home}`);
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
