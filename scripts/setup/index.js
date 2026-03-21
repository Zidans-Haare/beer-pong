#!/usr/bin/env node
'use strict';

async function main() {
    const { default: chalk } = await import('chalk');
    const { default: ora } = await import('ora');
    const { select, confirm } = require('@inquirer/prompts');
    const { setDryRun } = require('./utils/shell');
    const { askQuestions } = require('./questions');

    const DRY_RUN = process.argv.includes('--dry-run');
    if (DRY_RUN) {
        setDryRun(true);
        console.log(chalk.yellow('\n  ⚠  DRY RUN — no changes will be made\n'));
    }
    const { checkSystemDeps } = require('./installers/system');
    const { cloneOrPull } = require('./installers/clone');
    const { generateEnv } = require('./generators/env');
    const { generateNginx } = require('./generators/nginx');
    const { setupCronBackup } = require('./generators/cron');
    const { setupDatabase } = require('./installers/database');
    const { setupPm2 } = require('./installers/pm2');

    const W = 56; // box width
    const line  = (s = '') => chalk.magenta('│') + s + chalk.magenta('│');
    const pad   = (s, w) => s + ' '.repeat(Math.max(0, w - stripAnsi(s)));
    const top   = chalk.magenta('┌' + '─'.repeat(W) + '┐');
    const mid   = chalk.magenta('├' + '─'.repeat(W) + '┤');
    const bot   = chalk.magenta('└' + '─'.repeat(W) + '┘');

    // Rough ANSI-strip for padding calc
    function stripAnsi(s) {
        return s.replace(/\x1B\[[0-9;]*m/g, '').length;
    }
    function center(text, width) {
        const len = stripAnsi(text);
        const left = Math.floor((width - len) / 2);
        const right = width - len - left;
        return ' '.repeat(left) + text + ' '.repeat(right);
    }
    function row(text) {
        return line(center(text, W));
    }

    // ── Banner ────────────────────────────────────────────────────────────
    console.log('');
    console.log(top);
    console.log(row(''));
    console.log(row(chalk.bold.white('🍺  Beer Pong — Setup Wizard')));
    console.log(row(chalk.magenta('v1.0') + chalk.dim('  ·  Self-hosting made easy')));
    console.log(row(''));
    console.log(bot);
    console.log('');
    console.log(chalk.dim('  Press ') + chalk.white('Enter') + chalk.dim(' to accept defaults  ·  ') + chalk.white('Ctrl+C') + chalk.dim(' to abort'));
    console.log('');

    // ── Mode selection ────────────────────────────────────────────────────
    const modeFlag = (() => {
        const idx = process.argv.indexOf('--mode');
        return idx !== -1 ? process.argv[idx + 1] : null;
    })();

    let mode;
    if (modeFlag === 'local' || modeFlag === 'server') {
        mode = modeFlag;
        const label = mode === 'local' ? chalk.cyan('Local development') : chalk.yellow('Production server');
        console.log(chalk.dim('  Mode: ') + label + '\n');
    } else {
        try {
            mode = await select({
                message: 'Deployment target',
                choices: [
                    {
                        name: chalk.cyan('Local development') + chalk.dim('   .env + DB only, skip nginx/PM2'),
                        value: 'local',
                    },
                    {
                        name: chalk.yellow('Production server') + chalk.dim('  full setup: nginx, SSL, PM2, cron'),
                        value: 'server',
                    },
                ],
            });
        } catch (err) {
            if (err.name === 'ExitPromptError') {
                console.log('\n' + chalk.yellow('  Aborted.'));
                process.exit(0);
            }
            throw err;
        }
        console.log('');
    }

    // ── Section header helper ─────────────────────────────────────────────
    function section(icon, title) {
        console.log('');
        console.log(chalk.magenta('  ' + icon + '  ') + chalk.bold(title));
        console.log(chalk.magenta('  ' + '─'.repeat(W - 2)));
    }

    // ── Questions ─────────────────────────────────────────────────────────
    let answers;
    try {
        answers = await askQuestions(mode, section);
    } catch (err) {
        if (err.name === 'ExitPromptError') {
            console.log('\n' + chalk.yellow('  Aborted.'));
            process.exit(0);
        }
        throw err;
    }

    // ── Already-deployed guard (server mode only) ─────────────────────────
    if (mode === 'server' && !DRY_RUN) {
        const { commandExists } = require('./utils/shell');
        const { nvmPrefix } = require('./utils/nvm');
        const { runShell } = require('./utils/shell');
        const fs = require('fs');
        const path = require('path');

        const envExists = fs.existsSync(path.join(answers.appPath, '.env'));
        let pm2Running = false;
        if (commandExists('pm2') || commandExists('node')) {
            try {
                const nvm = nvmPrefix();
                runShell(`${nvm}pm2 show beer-pong`);
                pm2Running = true;
            } catch { /* not running */ }
        }

        if (envExists || pm2Running) {
            console.log('');
            console.log(chalk.yellow('  ⚠  Existing installation detected'));
            if (envExists)   console.log(chalk.dim('     · .env already exists'));
            if (pm2Running)  console.log(chalk.dim('     · PM2 process "beer-pong" is running'));
            console.log('');
            console.log(chalk.dim('  The setup wizard is intended for INITIAL installation.'));
            console.log(chalk.dim('  For updates, use the CI/CD pipeline (push to main).'));
            console.log('');

            let continueAnyway;
            try {
                continueAnyway = await confirm({
                    message: chalk.yellow('Continue anyway? This may interrupt the running app.'),
                    default: false,
                });
            } catch (err) {
                if (err.name === 'ExitPromptError') {
                    console.log('\n' + chalk.yellow('  Aborted.'));
                    process.exit(0);
                }
                throw err;
            }

            if (!continueAnyway) {
                console.log('\n' + chalk.green('  Smart choice. Use the update script instead:'));
                console.log(chalk.cyan('  bash ~/beer-pong/scripts/update.sh'));
                process.exit(0);
            }

            // Clean up existing installation before re-setup
            const nvm2 = nvmPrefix();
            if (pm2Running) {
                try { runShell(`${nvm2}pm2 delete beer-pong`); } catch { /* ignore */ }
                try { runShell(`${nvm2}pm2 save`); } catch { /* ignore */ }
            }
            console.log('');
        }
    }

    // ── Summary ───────────────────────────────────────────────────────────
    console.log('');
    console.log(top);
    console.log(row(chalk.bold.white('Summary')));
    console.log(mid);

    function summaryRow(label, value) {
        const l = chalk.dim('  ' + label.padEnd(12));
        const v = value;
        return line(' ' + pad(l + v, W - 2) + ' ');
    }

    const modeLabel = mode === 'local'
        ? chalk.cyan('Local development')
        : chalk.yellow('Production server');

    console.log(summaryRow('Mode', modeLabel));
    if (mode === 'server') {
        console.log(summaryRow('Domain', chalk.white(answers.domain)));
    }
    console.log(summaryRow('Port', chalk.white(answers.port)));
    console.log(summaryRow('Admin', chalk.white(answers.adminEmail)));
    console.log(summaryRow('Email', answers.resendApiKey ? chalk.green('✓ Resend') : chalk.dim('—')));
    console.log(summaryRow('VAPID', answers.generateVapid ? chalk.green('✓ generate') : chalk.dim('—')));
    console.log(summaryRow('Sentry', answers.sentryDsn ? chalk.green('✓ configured') : chalk.dim('—')));
    if (mode === 'server') {
        console.log(summaryRow('DB backup', answers.dbBackup ? chalk.green('✓ weekly') : chalk.dim('—')));
    }
    console.log(bot);
    console.log('');

    let proceed;
    try {
        proceed = await confirm({ message: 'Start setup?', default: true });
    } catch (err) {
        if (err.name === 'ExitPromptError') {
            console.log('\n' + chalk.yellow('  Aborted.'));
            process.exit(0);
        }
        throw err;
    }

    if (!proceed) {
        console.log('\n' + chalk.yellow('  Aborted.'));
        process.exit(0);
    }

    console.log('');

    // ── Progress helper ───────────────────────────────────────────────────
    const steps = mode === 'local'
        ? ['.env', 'Database']
        : ['System deps', 'Clone repo', '.env', 'Nginx + SSL', 'Database', 'Build + PM2',
           ...(answers.dbBackup ? ['Cron backup'] : []),
           'Shell aliases',
           ];
    let stepIdx = 0;

    function makeSpinner(label) {
        stepIdx++;
        const prefix = chalk.magenta(`  [${stepIdx}/${steps.length}]`);
        return ora({
            text: `${prefix} ${chalk.bold(label)}`,
            color: 'magenta',
            spinner: 'dots',
        }).start();
    }

    function ok(sp, label, detail = '') {
        sp.stopAndPersist({
            symbol: chalk.green('  ✔'),
            text: chalk.bold(label) + (detail ? chalk.dim('  ' + detail) : ''),
        });
    }

    function fail(sp, label, detail = '') {
        sp.stopAndPersist({
            symbol: chalk.red('  ✖'),
            text: chalk.bold(label) + (detail ? chalk.dim('\n      ' + detail) : ''),
        });
    }

    // ── LOCAL mode ────────────────────────────────────────────────────────
    if (mode === 'local') {
        let sp = makeSpinner('Generating .env…');
        try {
            const envPath = await generateEnv(answers, sp);
            ok(sp, '.env ready', envPath);
        } catch (err) {
            fail(sp, '.env failed', err.message);
            process.exit(1);
        }

        sp = makeSpinner('Initializing database…');
        try {
            setupDatabase(answers, sp);
            ok(sp, 'Database initialized');
        } catch (err) {
            fail(sp, 'Database failed', err.message);
            console.log(chalk.dim('      Run manually: npx prisma generate && npx prisma migrate deploy'));
        }

        console.log('');
        console.log(top);
        console.log(row(chalk.bold.green('✓  Local setup complete!')));
        console.log(mid);
        console.log(row(''));
        console.log(row(chalk.dim('Next steps:')));
        console.log(row('  ' + chalk.white('1.') + chalk.dim(' Review ') + chalk.cyan('.env') + chalk.dim(' and fill in missing values')));
        console.log(row('  ' + chalk.white('2.') + '  ' + chalk.cyan('npm run dev')));
        console.log(row('  ' + chalk.white('3.') + '  ' + chalk.cyan('http://localhost:' + answers.port + '/register')));
        console.log(row(''));
        console.log(bot);
        console.log('');
        return;
    }

    // ── SERVER mode ───────────────────────────────────────────────────────
    let sp;

    sp = makeSpinner('Checking system dependencies…');
    try {
        await checkSystemDeps(answers, sp);
        ok(sp, 'System dependencies ready');
    } catch (err) {
        fail(sp, 'Dependency install failed', err.message);
        process.exit(1);
    }

    sp = makeSpinner('Cloning repository…');
    try {
        cloneOrPull(answers, sp);
        ok(sp, 'Repository ready', answers.appPath);
    } catch (err) {
        fail(sp, 'Git failed', err.message);
        process.exit(1);
    }

    sp = makeSpinner('Generating .env…');
    try {
        const envPath = await generateEnv(answers, sp);
        ok(sp, '.env ready', envPath);
    } catch (err) {
        fail(sp, '.env failed', err.message);
        process.exit(1);
    }

    sp = makeSpinner('Configuring nginx + SSL…');
    try {
        await generateNginx(answers, sp);
        ok(sp, 'Nginx configured', 'https://' + answers.domain);
    } catch (err) {
        fail(sp, 'Nginx failed', err.message);
        console.log(chalk.dim('      Continuing without nginx…'));
    }

    sp = makeSpinner('Initializing database…');
    try {
        setupDatabase(answers, sp);
        ok(sp, 'Database initialized');
    } catch (err) {
        fail(sp, 'Database failed', err.message);
        process.exit(1);
    }

    sp = makeSpinner('Building app + PM2…');
    try {
        setupPm2(answers, sp);
        ok(sp, 'App running', 'port ' + answers.port);
    } catch (err) {
        fail(sp, 'PM2 failed', err.message);
        process.exit(1);
    }

    if (answers.dbBackup) {
        sp = makeSpinner('Setting up cron backup…');
        try {
            setupCronBackup(answers, sp);
            ok(sp, 'Cron backup configured', 'Sundays 02:00');
        } catch (err) {
            fail(sp, 'Cron failed', err.message);
        }
    }

    // ── Shell aliases ─────────────────────────────────────────────────────
    sp = makeSpinner('Installing shell aliases…');
    try {
        const fs = require('fs');
        const os = require('os');
        const aliasesSrc = require('path').join(answers.appPath, 'scripts', 'aliases.sh');
        const bashrc = require('path').join(os.homedir(), '.bashrc');
        const marker = '# Beer Pong — Shell Aliases';
        const bashrcContent = fs.existsSync(bashrc) ? fs.readFileSync(bashrc, 'utf-8') : '';
        if (!bashrcContent.includes(marker)) {
            fs.appendFileSync(bashrc, `\n# >>> Beer Pong aliases >>>\nsource "${aliasesSrc}"\n# <<< Beer Pong aliases <<<\n`);
        }
        ok(sp, 'Shell aliases installed', 'run: source ~/.bashrc');
    } catch (err) {
        fail(sp, 'Aliases failed', err.message);
    }

    // ── Done ──────────────────────────────────────────────────────────────
    console.log('');
    console.log(top);
    console.log(row(chalk.bold.green('✓  Setup complete!')));
    console.log(mid);
    console.log(row(''));
    console.log(row(chalk.dim('Next steps:')));
    console.log(row('  ' + chalk.white('1.') + '  ' + chalk.cyan(`https://${answers.domain}/register`)));
    console.log(row('     ' + chalk.dim('Create your admin account (email = ADMIN_EMAIL)')));
    console.log(row('  ' + chalk.white('2.') + '  ' + chalk.cyan(`bash ~/beer-pong/scripts/update.sh`) + chalk.dim('  # update')));
    console.log(row(''));
    console.log(mid);
    console.log(row(chalk.dim('  bp-update               # update to latest version')));
    console.log(row(chalk.dim('  bp-doctor               # check for issues')));
    console.log(row(chalk.dim('  bp-logs                 # view logs')));
    console.log(row(chalk.dim('  bp-maint-on / off       # maintenance mode')));
    console.log(row(chalk.dim('  bp-restart              # restart app')));
    console.log(row('  ' + chalk.dim('Run ') + chalk.cyan('source ~/.bashrc') + chalk.dim(' to activate')));
    console.log(row(''));
    console.log(mid);
    console.log(row(chalk.bold.white('Auto-Updates via GitHub Webhook')));
    console.log(row(''));
    console.log(row(chalk.dim('  In your GitHub repo → Settings → Webhooks:')));
    console.log(row('  ' + chalk.dim('Payload URL:  ') + chalk.cyan(`https://${answers.domain}/api/deploy`)));
    console.log(row('  ' + chalk.dim('Content type: ') + chalk.white('application/json')));
    console.log(row('  ' + chalk.dim('Secret:       ') + chalk.white('DEPLOY_SECRET') + chalk.dim(' from .env')));
    console.log(row('  ' + chalk.dim('Event:        ') + chalk.white('Just the push event')));
    console.log(row(''));
    console.log(bot);
    console.log('');
}

main().catch(err => {
    console.error('\n  ✖  ' + (err.message || err));
    process.exit(1);
});
