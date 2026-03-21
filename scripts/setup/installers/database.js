const { runShell } = require('../utils/shell');
const path = require('path');
const fs = require('fs');

const NVM_INIT = `export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"`;

/**
 * Initializes the database: prisma generate + migrate deploy.
 */
function setupDatabase(answers, spinner) {
    const { appPath } = answers;

    const backupsDir = path.join(appPath, 'prisma', 'backups');
    if (!fs.existsSync(backupsDir)) {
        fs.mkdirSync(backupsDir, { recursive: true });
    }

    spinner.text = 'Running prisma generate…';
    runShell(`cd "${appPath}" && ${NVM_INIT} && npx prisma generate`);

    spinner.text = 'Running prisma migrate deploy…';
    runShell(`cd "${appPath}" && ${NVM_INIT} && npx prisma migrate deploy`);
}

module.exports = { setupDatabase };
