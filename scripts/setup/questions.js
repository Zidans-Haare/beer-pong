const { input, password, confirm } = require('@inquirer/prompts');
const os = require('os');
const path = require('path');
const { validateDomain, validateEmail, validatePort } = require('./utils/validate');

async function askQuestions(mode, section) {
    const answers = { mode };
    const user = os.userInfo().username;
    const home = os.homedir();

    answers.appPath = mode === 'local'
        ? process.cwd()
        : path.join(home, 'beer-pong');

    // ── Basic configuration ──────────────────────────────────────────────
    section('⚙', 'Basic configuration');

    answers.appName = await input({
        message: 'App name:',
        default: 'Beer Pong',
    });

    if (mode === 'server') {
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

    answers.adminEmail = await input({
        message: 'Admin email:',
        validate: validateEmail,
    });

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

    answers.sentryDsn = await input({
        message: 'Sentry DSN (leave empty to skip):',
        default: '',
    });

    // ── Google Maps ──────────────────────────────────────────────────────
    section('🗺', 'Maps  (Google Maps)');

    answers.googleMapsKey = await input({
        message: 'Google Maps API key (leave empty to skip):',
        default: '',
    });

    // ── GitHub Actions ───────────────────────────────────────────────────
    if (mode === 'server') {
        section('🚀', 'CI/CD  (GitHub Actions)');

        answers.setupGithub = await confirm({
            message: 'Set up GitHub Actions secrets?  (requires gh CLI)',
            default: false,
        });

        if (answers.setupGithub) {
            answers.repoOwner = await input({
                message: 'GitHub repository (owner/repo):',
                validate: (v) => v.trim() ? true : 'Required',
            });

            answers.sshHost = await input({
                message: 'Server IP or hostname:',
                validate: (v) => v.trim() ? true : 'Required',
            });

            answers.sshUser = await input({
                message: 'SSH user:',
                default: user,
            });

            answers.sshKeyPath = await input({
                message: 'SSH private key path:',
                default: path.join(home, '.ssh', 'id_rsa'),
            });

            answers.e2eEmail = await input({
                message: 'E2E test user email:',
                default: answers.adminEmail,
                validate: validateEmail,
            });

            answers.e2ePassword = await password({
                message: 'E2E test user password:',
                mask: '*',
            });
        }
    } else {
        answers.setupGithub = false;
    }

    console.log('');
    return answers;
}

module.exports = { askQuestions };
