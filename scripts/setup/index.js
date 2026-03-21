#!/usr/bin/env node
'use strict';

async function main() {
    const { default: chalk } = await import('chalk');
    const { default: ora } = await import('ora');
    const { select, confirm } = require('@inquirer/prompts');
    const { askQuestions } = require('./questions');
    const { generateEnv } = require('./generators/env');
    const { generateNginx } = require('./generators/nginx');
    const { setupCronBackup } = require('./generators/cron');
    const { setupDatabase } = require('./installers/database');
    const { setupPm2 } = require('./installers/pm2');
    const { setupGithubSecrets } = require('./installers/github');

    // ── Banner ────────────────────────────────────────────────────────────
    console.log('');
    console.log(chalk.bold.magenta('╔══════════════════════════════════════════════════════╗'));
    console.log(chalk.bold.magenta('║') + chalk.bold('        Beer Pong — Setup Wizard v1.0               ') + chalk.bold.magenta('║'));
    console.log(chalk.bold.magenta('╚══════════════════════════════════════════════════════╝'));
    console.log('');
    console.log(chalk.dim('This wizard configures the Beer Pong app for your environment.'));
    console.log(chalk.dim('Press Enter to accept defaults. Ctrl+C to abort at any time.'));
    console.log('');

    // ── Mode selection ────────────────────────────────────────────────────
    let mode;
    try {
        mode = await select({
            message: 'Where are you deploying?',
            choices: [
                {
                    name: 'Local development  — generates .env, initializes DB',
                    value: 'local',
                },
                {
                    name: 'Production server  — full setup: nginx, SSL, PM2, cron',
                    value: 'server',
                },
            ],
        });
    } catch (err) {
        if (err.name === 'ExitPromptError') {
            console.log('\n' + chalk.yellow('Setup cancelled.'));
            process.exit(0);
        }
        throw err;
    }

    // ── Questions ─────────────────────────────────────────────────────────
    let answers;
    try {
        answers = await askQuestions(mode);
    } catch (err) {
        if (err.name === 'ExitPromptError') {
            console.log('\n' + chalk.yellow('Setup cancelled.'));
            process.exit(0);
        }
        throw err;
    }

    // ── Summary ───────────────────────────────────────────────────────────
    console.log('');
    console.log(chalk.bold('══════════════════════════════════════════════════════'));
    console.log(chalk.bold('Summary:'));
    console.log(`  Mode:      ${chalk.cyan(mode === 'local' ? 'Local development' : 'Production server')}`);
    if (mode === 'server') {
        console.log(`  Domain:    ${chalk.cyan(answers.domain)}`);
    }
    console.log(`  Port:      ${chalk.cyan(answers.port)}`);
    console.log(`  Admin:     ${chalk.cyan(answers.adminEmail)}`);
    console.log(`  Email:     ${answers.resendApiKey ? chalk.green('✓ Resend configured') : chalk.dim('skipped')}`);
    console.log(`  VAPID:     ${answers.generateVapid ? chalk.green('✓ will be generated') : chalk.dim('skipped')}`);
    console.log(`  Sentry:    ${answers.sentryDsn ? chalk.green('✓ configured') : chalk.dim('skipped')}`);
    if (mode === 'server') {
        console.log(`  DB backup: ${answers.dbBackup ? chalk.green('✓ weekly cron') : chalk.dim('skipped')}`);
        console.log(`  GitHub:    ${answers.setupGithub ? chalk.green('✓ ' + answers.repoOwner) : chalk.dim('skipped')}`);
    }
    console.log(chalk.bold('══════════════════════════════════════════════════════'));
    console.log('');

    let proceed;
    try {
        proceed = await confirm({ message: 'Start setup?', default: true });
    } catch (err) {
        if (err.name === 'ExitPromptError') {
            console.log('\n' + chalk.yellow('Setup cancelled.'));
            process.exit(0);
        }
        throw err;
    }

    if (!proceed) {
        console.log(chalk.yellow('Setup cancelled.'));
        process.exit(0);
    }

    console.log('');

    const spinner = ora({ color: 'magenta' });

    // ── LOCAL mode ────────────────────────────────────────────────────────
    if (mode === 'local') {
        // 1. Generate .env
        spinner.start('Generating .env…');
        try {
            const envPath = await generateEnv(answers, spinner);
            spinner.succeed(chalk.green('.env generated') + chalk.dim(' → ' + envPath));
        } catch (err) {
            spinner.fail(chalk.red('.env error: ' + err.message));
            process.exit(1);
        }

        // 2. Initialize database
        spinner.start('Initializing database…');
        try {
            setupDatabase(answers, spinner);
            spinner.succeed(chalk.green('Database initialized'));
        } catch (err) {
            spinner.fail(chalk.red('Database error: ' + err.message));
            console.log(chalk.dim('  Run manually: npx prisma generate && npx prisma migrate deploy'));
        }

        console.log('');
        console.log(chalk.bold.green('✓ Local setup complete!'));
        console.log('');
        console.log(chalk.bold('Next steps:'));
        console.log(`  1. Review ${chalk.cyan('.env')} and fill in any missing values`);
        console.log(`  2. Start the dev server: ${chalk.cyan('npm run dev')}`);
        console.log(`  3. Open ${chalk.cyan('http://localhost:' + answers.port + '/register')} and create your admin account`);
        console.log(`     ${chalk.dim('(email must match ADMIN_EMAIL: ' + answers.adminEmail + ')')}`);
        console.log('');
        return;
    }

    // ── SERVER mode ───────────────────────────────────────────────────────

    // 1. Generate .env
    spinner.start('Generating .env…');
    try {
        const envPath = await generateEnv(answers, spinner);
        spinner.succeed(chalk.green('.env generated') + chalk.dim(' → ' + envPath));
    } catch (err) {
        spinner.fail(chalk.red('.env error: ' + err.message));
        process.exit(1);
    }

    // 3. Nginx + SSL
    spinner.start('Configuring nginx…');
    try {
        await generateNginx(answers, spinner);
        spinner.succeed(chalk.green('Nginx configured') + chalk.dim(` → https://${answers.domain}`));
    } catch (err) {
        spinner.fail(chalk.red('Nginx error: ' + err.message));
        console.log(chalk.dim('  Continuing without nginx…'));
    }

    // 4. Database
    spinner.start('Initializing database…');
    try {
        setupDatabase(answers, spinner);
        spinner.succeed(chalk.green('Database initialized'));
    } catch (err) {
        spinner.fail(chalk.red('Database error: ' + err.message));
        process.exit(1);
    }

    // 5. Build + PM2
    spinner.start('Building app and setting up PM2…');
    try {
        setupPm2(answers, spinner);
        spinner.succeed(chalk.green('App running') + chalk.dim(` → port ${answers.port}`));
    } catch (err) {
        spinner.fail(chalk.red('PM2 error: ' + err.message));
        process.exit(1);
    }

    // 6. Cron backup
    if (answers.dbBackup) {
        spinner.start('Setting up cron backup…');
        try {
            setupCronBackup(answers, spinner);
            spinner.succeed(chalk.green('Cron backup configured'));
        } catch (err) {
            spinner.fail(chalk.red('Cron error: ' + err.message));
        }
    }

    // 7. GitHub secrets
    if (answers.setupGithub) {
        spinner.start('Setting GitHub secrets…');
        try {
            setupGithubSecrets(answers, spinner);
            spinner.succeed(chalk.green('GitHub secrets set'));
        } catch (err) {
            spinner.fail(chalk.red('GitHub error: ' + err.message));
        }
    }

    // ── Done ──────────────────────────────────────────────────────────────
    console.log('');
    console.log(chalk.bold.green('✓ Setup complete!'));
    console.log('');
    console.log(chalk.bold('Next steps:'));
    console.log(`  1. Open ${chalk.cyan(`https://${answers.domain}/register`)} and create your admin account`);
    console.log(`     ${chalk.dim('(email must match ADMIN_EMAIL: ' + answers.adminEmail + ')')}`);
    console.log(`  2. For CI/CD: push to the main branch on GitHub`);
    console.log(`     ${chalk.dim('→ Tests run automatically, deploy starts on success')}`);
    console.log('');
    console.log(chalk.dim('Useful commands:'));
    console.log(chalk.dim('  pm2 logs beer-pong       # view logs'));
    console.log(chalk.dim('  pm2 restart beer-pong    # restart app'));
    console.log(chalk.dim('  pm2 status               # process overview'));
    console.log('');
}

main().catch(err => {
    console.error('\n' + (err.message || err));
    process.exit(1);
});
