const { runShell } = require('../utils/shell');
const path = require('path');
const fs = require('fs');

/**
 * Initialisiert die Datenbank: Prisma generate + migrate deploy.
 */
function setupDatabase(answers, spinner) {
    const { appPath } = answers;

    // Backup-Verzeichnis sicherstellen
    const backupsDir = path.join(appPath, 'prisma', 'backups');
    if (!fs.existsSync(backupsDir)) {
        fs.mkdirSync(backupsDir, { recursive: true });
    }

    const nvmInit = `export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"`;

    spinner.text = 'Führe prisma generate aus…';
    runShell(`cd "${appPath}" && ${nvmInit} && npx prisma generate`);

    spinner.text = 'Führe prisma migrate deploy aus…';
    runShell(`cd "${appPath}" && ${nvmInit} && npx prisma migrate deploy`);

    spinner.text = 'Datenbank initialisiert';
}

module.exports = { setupDatabase };
