const { input, confirm, select } = require('@inquirer/prompts');
const os = require('os');
const path = require('path');
const { validateDomain, validateEmail, validatePort } = require('./utils/validate');

async function askQuestions(mode, section) {
    const { default: chalk } = await import('chalk');
    const answers = { mode };
    const user = os.userInfo().username;
    const home = os.homedir();

    answers.appPath = mode === 'local'
        ? process.cwd()
        : path.join(home, 'beer-pong');

    answers.locale = await select({
        message: 'Language / Sprache',
        choices: [
            { name: 'English', value: 'en' },
            { name: 'Deutsch', value: 'de' },
        ],
        default: 'en',
    });

    // ── Basic configuration ──────────────────────────────────────────────
    section('⚙', 'Basic configuration');

    answers.appName = await input({
        message: 'App name:',
        default: 'Beer Pong',
    });

    if (mode === 'server') {
        console.log('');
        console.log(chalk.dim('  DNS — set these records at your domain registrar before continuing:'));
        console.log(chalk.dim('  ┌─────────────────────────────────────────────────────┐'));
        console.log(chalk.dim('  │  Type   Name        Value                           │'));
        console.log(chalk.dim('  │  A      @           <your server IP>                │'));
        console.log(chalk.dim('  │  A      www         <your server IP>   (optional)   │'));
        console.log(chalk.dim('  └─────────────────────────────────────────────────────┘'));
        console.log(chalk.dim('  SSL (certbot) requires the domain to already point to this server.'));
        console.log('');
        answers.domain = await input({
            message: 'Domain (e.g. beerping.example.com):',
            validate: validateDomain,
        });
    } else {
        answers.domain = 'localhost';
    }

    answers.port = await input({
        message: 'App port:',
        default: '3000',
        validate: validatePort,
    });

    while (true) {
        answers.adminEmail = await input({
            message: 'Admin email:',
            validate: validateEmail,
        });
        const adminEmailConfirm = await input({
            message: 'Confirm admin email:',
            validate: validateEmail,
        });
        if (answers.adminEmail === adminEmailConfirm) break;
        console.log(chalk.red('  ✖  Emails do not match — please try again.'));
        console.log('');
    }

    // ── Database ─────────────────────────────────────────────────────────
    if (mode === 'server') {
        section('🗄', 'Database');
        answers.dbBackup = await confirm({
            message: 'Weekly DB backup via cron?',
            default: true,
        });
    } else {
        answers.dbBackup = false;
    }

    // ── Email ────────────────────────────────────────────────────────────
    section('✉', 'Email  (Resend)');
    console.log(chalk.dim('  Enables email notifications (e.g. account approval).'));
    console.log(chalk.dim('  1. Create account at resend.com'));
    console.log(chalk.dim('  2. Add & verify your domain → get SPF/DKIM DNS records'));
    console.log(chalk.dim('  3. Create an API key with Sending access'));
    console.log('');

    answers.resendApiKey = await input({
        message: 'Resend API key (leave empty to skip):',
        default: '',
    });

    if (answers.resendApiKey) {
        answers.emailFrom = await input({
            message: 'Sender email:',
            default: mode === 'server' ? `noreply@${answers.domain}` : 'noreply@localhost',
            validate: validateEmail,
        });
    } else {
        answers.emailFrom = mode === 'server' ? `noreply@${answers.domain}` : 'noreply@localhost';
    }

    // ── Push Notifications ───────────────────────────────────────────────
    section('🔔', 'Push Notifications  (VAPID)');

    answers.generateVapid = await confirm({
        message: 'Generate VAPID keys?',
        default: true,
    });

    // ── Sentry ───────────────────────────────────────────────────────────
    section('🐛', 'Error Tracking  (Sentry)');
    console.log(chalk.dim('  Tracks runtime errors in production automatically.'));
    console.log(chalk.dim('  1. Create account at sentry.io'));
    console.log(chalk.dim('  2. New Project → Next.js → copy the DSN'));
    console.log('');

    answers.sentryDsn = await input({
        message: 'Sentry DSN (leave empty to skip):',
        default: '',
    });

    // ── Google Maps ──────────────────────────────────────────────────────
    section('🗺', 'Maps  (Google Maps)');
    console.log(chalk.dim('  Enables location autocomplete for tournaments (optional).'));
    console.log(chalk.dim('  1. console.cloud.google.com → new project'));
    console.log(chalk.dim('  2. Enable: Maps JavaScript API + Places API'));
    console.log(chalk.dim('  3. Create API key → restrict to your domain'));
    console.log('');

    answers.googleMapsKey = await input({
        message: 'Google Maps API key (leave empty to skip):',
        default: '',
    });

    answers.setupGithub = false; // CI/CD setup is for developers — see docs/cicd.md

    console.log('');
    return answers;
}

module.exports = { askQuestions };
