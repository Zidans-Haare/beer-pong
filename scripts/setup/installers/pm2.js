const { runShell, commandExists } = require('../utils/shell');
const path = require('path');
const os = require('os');

const NVM_INIT = `export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"`;

/**
 * Baut die App und richtet PM2 ein.
 */
function setupPm2(answers, spinner) {
    const { appPath, port } = answers;
    const dbPath = path.join(appPath, 'prisma', 'dev.db');
    const serverScript = path.join(appPath, '.next', 'standalone', 'server.js');
    const pm2Name = 'beer-pong';
    const user = os.userInfo().username;
    const home = os.homedir();

    // Build
    spinner.text = 'Installiere Abhängigkeiten (npm ci)…';
    runShell(`cd "${appPath}" && ${NVM_INIT} && npm ci`);

    spinner.text = 'Baue App (npm run build)…';
    runShell(`cd "${appPath}" && ${NVM_INIT} && npm run build`);

    // Maintenance-Files entfernen falls vorhanden
    runShell(`rm -f "${appPath}/.next/standalone/public/maintenance.on" "${appPath}/.next/standalone/public/maintenance-msg.txt" 2>/dev/null || true`);

    // PM2 einrichten
    spinner.text = 'Richte PM2 ein…';

    // Prüfen ob Prozess bereits läuft
    let pm2Running = false;
    try {
        runShell(`${NVM_INIT} && pm2 show ${pm2Name}`);
        pm2Running = true;
    } catch { /* Prozess existiert nicht */ }

    if (pm2Running) {
        spinner.text = `PM2-Prozess "${pm2Name}" bereits vorhanden — starte neu…`;
        runShell(`${NVM_INIT} && DATABASE_URL="file:${dbPath}" PORT=${port} pm2 restart ${pm2Name} --update-env`);
    } else {
        runShell(
            `${NVM_INIT} && DATABASE_URL="file:${dbPath}" PORT=${port} ` +
            `pm2 start "${serverScript}" --name ${pm2Name}`
        );
    }

    runShell(`${NVM_INIT} && pm2 save`);

    // Systemd-Integration (einmalig)
    spinner.text = 'Richte PM2-Autostart ein…';
    try {
        const startupCmd = runShell(`${NVM_INIT} && pm2 startup systemd -u ${user} --hp ${home}`);
        // PM2 gibt den sudo-Befehl aus — wenn wir sudo haben, direkt ausführen
        const sudoLine = startupCmd.split('\n').find(l => l.trim().startsWith('sudo'));
        if (sudoLine) {
            try {
                runShell(sudoLine.trim());
            } catch {
                spinner.warn('PM2 Startup-Befehl konnte nicht automatisch ausgeführt werden.');
                spinner.warn('Führe manuell aus: ' + sudoLine.trim());
            }
        }
    } catch {
        spinner.warn('PM2-Autostart konnte nicht eingerichtet werden — bitte manuell konfigurieren.');
    }

    spinner.text = `PM2-Prozess "${pm2Name}" läuft auf Port ${port}`;
}

module.exports = { setupPm2 };
