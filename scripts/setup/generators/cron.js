const { runShell } = require('../utils/shell');
const path = require('path');
const fs = require('fs');

/**
 * Adds a weekly DB backup cron job.
 */
function setupCronBackup(answers, spinner) {
    const { appPath } = answers;
    const backupsDir = path.join(appPath, 'prisma', 'backups');

    spinner.text = 'Creating backup directory…';
    if (!fs.existsSync(backupsDir)) {
        fs.mkdirSync(backupsDir, { recursive: true });
    }

    // Sunday at 2am
    const cronLine = `0 2 * * 0 cd "${appPath}" && cp prisma/dev.db "prisma/backups/db_$(date +\\%Y-\\%m-\\%d).db" 2>&1 | logger -t beer-pong-backup`;

    let currentCron = '';
    try {
        currentCron = runShell('crontab -l');
    } catch { /* no crontab yet */ }

    if (currentCron.includes('beer-pong-backup')) {
        spinner.text = 'Cron backup job already exists — skipped';
        return;
    }

    const newCron = currentCron
        ? currentCron.trimEnd() + '\n' + cronLine + '\n'
        : cronLine + '\n';

    runShell(`echo ${JSON.stringify(newCron)} | crontab -`);
    spinner.text = 'Cron job set up (Sundays at 02:00)';
}

module.exports = { setupCronBackup };
