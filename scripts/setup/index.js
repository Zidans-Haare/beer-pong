#!/usr/bin/env node
'use strict';

// chalk v5 ist ESM-only — dynamischer Import nötig
async function main() {
    const { default: chalk } = await import('chalk');
    const { default: ora } = await import('ora');
    const { askQuestions } = require('./questions');
    const { generateEnv } = require('./generators/env');
    const { generateNginx } = require('./generators/nginx');
    const { setupCronBackup } = require('./generators/cron');
    const { setupDatabase } = require('./installers/database');
    const { setupPm2 } = require('./installers/pm2');
    const { setupGithubSecrets } = require('./installers/github');

    // ─── Banner ────────────────────────────────────────────────────────────
    console.log('');
    console.log(chalk.bold.magenta('╔══════════════════════════════════════════════════════╗'));
    console.log(chalk.bold.magenta('║') + chalk.bold('       Bier Pong — Setup Wizard v1.0                ') + chalk.bold.magenta('║'));
    console.log(chalk.bold.magenta('╚══════════════════════════════════════════════════════╝'));
    console.log('');
    console.log(chalk.dim('Dieser Wizard richtet die Bier Pong App auf deinem Server ein.'));
    console.log(chalk.dim('Alle Fragen können mit Enter übersprungen werden (Standardwert).'));
    console.log('');

    // ─── Fragen stellen ────────────────────────────────────────────────────
    let answers;
    try {
        answers = await askQuestions();
    } catch (err) {
        if (err.name === 'ExitPromptError') {
            console.log('\n' + chalk.yellow('Setup abgebrochen.'));
            process.exit(0);
        }
        throw err;
    }

    // ─── Zusammenfassung ──────────────────────────────────────────────────
    console.log('');
    console.log(chalk.bold('══════════════════════════════════════════════════════'));
    console.log(chalk.bold('Zusammenfassung:'));
    console.log(`  Domain:    ${chalk.cyan(answers.domain)}`);
    console.log(`  App-Pfad:  ${chalk.cyan(answers.appPath)}`);
    console.log(`  Port:      ${chalk.cyan(answers.port)}`);
    console.log(`  Admin:     ${chalk.cyan(answers.adminEmail)}`);
    console.log(`  Email:     ${answers.resendApiKey ? chalk.green('✓ Resend konfiguriert') : chalk.dim('übersprungen')}`);
    console.log(`  VAPID:     ${answers.generateVapid ? chalk.green('✓ wird generiert') : chalk.dim('übersprungen')}`);
    console.log(`  Sentry:    ${answers.sentryDsn ? chalk.green('✓ konfiguriert') : chalk.dim('übersprungen')}`);
    console.log(`  GitHub:    ${answers.setupGithub ? chalk.green('✓ ' + answers.repoOwner) : chalk.dim('übersprungen')}`);
    console.log(chalk.bold('══════════════════════════════════════════════════════'));
    console.log('');

    const { confirm } = require('@inquirer/prompts');
    const proceed = await confirm({ message: 'Setup starten?', default: true });
    if (!proceed) {
        console.log(chalk.yellow('Setup abgebrochen.'));
        process.exit(0);
    }

    console.log('');

    // ─── Setup ausführen ──────────────────────────────────────────────────
    const spinner = ora({ color: 'magenta' });

    // 1. .env generieren
    spinner.start('.env generieren…');
    try {
        const envPath = await generateEnv(answers, spinner);
        spinner.succeed(chalk.green('.env generiert') + chalk.dim(' → ' + envPath));
    } catch (err) {
        spinner.fail(chalk.red('.env Fehler: ' + err.message));
        process.exit(1);
    }

    // 2. Nginx + SSL
    spinner.start('Nginx konfigurieren…');
    try {
        await generateNginx(answers, spinner);
        spinner.succeed(chalk.green('Nginx konfiguriert') + chalk.dim(` → https://${answers.domain}`));
    } catch (err) {
        spinner.fail(chalk.red('Nginx Fehler: ' + err.message));
        console.log(chalk.dim('  Weiter ohne Nginx…'));
    }

    // 3. Datenbank
    spinner.start('Datenbank initialisieren…');
    try {
        setupDatabase(answers, spinner);
        spinner.succeed(chalk.green('Datenbank initialisiert'));
    } catch (err) {
        spinner.fail(chalk.red('Datenbank Fehler: ' + err.message));
        process.exit(1);
    }

    // 4. Build + PM2
    spinner.start('App bauen und PM2 einrichten…');
    try {
        setupPm2(answers, spinner);
        spinner.succeed(chalk.green('App läuft') + chalk.dim(` → Port ${answers.port}`));
    } catch (err) {
        spinner.fail(chalk.red('PM2 Fehler: ' + err.message));
        process.exit(1);
    }

    // 5. Cron-Backup
    if (answers.dbBackup) {
        spinner.start('Cron-Backup einrichten…');
        try {
            setupCronBackup(answers, spinner);
            spinner.succeed(chalk.green('Cron-Backup eingerichtet'));
        } catch (err) {
            spinner.fail(chalk.red('Cron Fehler: ' + err.message));
        }
    }

    // 6. GitHub Secrets
    if (answers.setupGithub) {
        spinner.start('GitHub Secrets setzen…');
        try {
            setupGithubSecrets(answers, spinner);
            spinner.succeed(chalk.green('GitHub Secrets gesetzt'));
        } catch (err) {
            spinner.fail(chalk.red('GitHub Fehler: ' + err.message));
        }
    }

    // ─── Fertig ───────────────────────────────────────────────────────────
    console.log('');
    console.log(chalk.bold.green('✓ Setup abgeschlossen!'));
    console.log('');
    console.log(chalk.bold('Nächste Schritte:'));
    console.log(`  1. Öffne ${chalk.cyan(`https://${answers.domain}/register`)} und registriere deinen Admin-Account`);
    console.log(`     ${chalk.dim('(Email muss mit ADMIN_EMAIL übereinstimmen: ' + answers.adminEmail + ')')}`);
    console.log('');
    console.log(`  2. Für CI/CD: Pushe auf den main-Branch in GitHub`);
    console.log(`     ${chalk.dim('→ Tests laufen automatisch, Deploy startet bei Erfolg')}`);
    console.log('');
    console.log(chalk.dim('Nützliche Befehle:'));
    console.log(chalk.dim(`  pm2 logs beer-pong          # Logs anschauen`));
    console.log(chalk.dim(`  pm2 restart beer-pong       # App neustarten`));
    console.log(chalk.dim(`  pm2 status                  # Status aller Prozesse`));
    console.log('');
}

main().catch(err => {
    console.error('\n' + (err.message || err));
    process.exit(1);
});
