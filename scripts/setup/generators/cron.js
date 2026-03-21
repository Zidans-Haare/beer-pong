const { runShell } = require('../utils/shell');
const path = require('path');

/**
 * Fügt einen wöchentlichen DB-Backup Cron-Job hinzu.
 * Erstellt das backups/-Verzeichnis und hängt den Cron-Job an.
 */
function setupCronBackup(answers, spinner) {
    const { appPath } = answers;
    const backupsDir = path.join(appPath, 'prisma', 'backups');

    // Backup-Verzeichnis anlegen
    spinner.text = 'Erstelle Backup-Verzeichnis…';
    runShell(`mkdir -p "${backupsDir}"`);

    // Cron-Job: Sonntags 2 Uhr nachts
    const cronLine = `0 2 * * 0 cd "${appPath}" && cp prisma/dev.db "prisma/backups/db_$(date +\\%Y-\\%m-\\%d).db" 2>&1 | logger -t beer-pong-backup`;

    // Prüfen ob bereits vorhanden
    let currentCron = '';
    try {
        currentCron = runShell('crontab -l');
    } catch {
        // Kein Crontab vorhanden — OK
    }

    if (currentCron.includes('beer-pong-backup')) {
        spinner.text = 'Cron-Backup-Job bereits vorhanden — übersprungen';
        return;
    }

    const newCron = currentCron
        ? currentCron.trimEnd() + '\n' + cronLine + '\n'
        : cronLine + '\n';

    runShell(`echo ${JSON.stringify(newCron)} | crontab -`);
    spinner.text = 'Cron-Job für DB-Backup eingerichtet (sonntags 02:00 Uhr)';
}

module.exports = { setupCronBackup };
