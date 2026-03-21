const { runShell } = require('../utils/shell');
const { nvmPrefix } = require('../utils/nvm');
const path = require('path');
const fs = require('fs');

/**
 * Initializes the database: prisma generate + migrate deploy.
 * Loads DATABASE_URL from the generated .env before running migrations.
 */
function setupDatabase(answers, spinner) {
    const { appPath } = answers;
    const nvm = nvmPrefix();

    const backupsDir = path.join(appPath, 'prisma', 'backups');
    if (!fs.existsSync(backupsDir)) {
        fs.mkdirSync(backupsDir, { recursive: true });
    }

    // Load DATABASE_URL from .env so prisma can find the db
    const envPath = path.join(appPath, '.env');
    const envExport = fs.existsSync(envPath)
        ? `set -a && . "${envPath}" && set +a && `
        : '';

    spinner.text = 'Running prisma generate…';
    runShell(`cd "${appPath}" && ${nvm}${envExport}npx prisma generate`);

    spinner.text = 'Running prisma migrate deploy…';
    runShell(`cd "${appPath}" && ${nvm}${envExport}npx prisma migrate deploy`);
}

module.exports = { setupDatabase };
