const { input, password, confirm } = require('@inquirer/prompts');
const os = require('os');
const path = require('path');
const { validateDomain, validateEmail, validatePort } = require('./utils/validate');

/**
 * Asks all wizard questions and returns an answers object.
 * appPath is always process.cwd() — the wizard must be run from the repo root.
 */
async function askQuestions(mode) {
    const answers = { mode };
    const user = os.userInfo().username;
    const home = os.homedir();

    answers.appPath = process.cwd();

    console.log('');

    // ── [1] Basic configuration ──────────────────────────────────────────
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

    // ── [2] Database ─────────────────────────────────────────────────────
    if (mode === 'server') {
        console.log('');
        answers.dbBackup = await confirm({
            message: 'Set up weekly DB backup via cron?',
            default: true,
        });
    } else {
        answers.dbBackup = false;
    }

    // ── [3] Email (Resend) ───────────────────────────────────────────────
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

    // ── [4] Push Notifications ───────────────────────────────────────────
    console.log('');
    answers.generateVapid = await confirm({
        message: 'Generate VAPID keys for push notifications?',
        default: true,
    });

    // ── [5] Sentry ───────────────────────────────────────────────────────
    console.log('');
    answers.sentryDsn = await input({
        message: 'Sentry DSN (leave empty to skip):',
        default: '',
    });

    // ── [6] Google Maps ──────────────────────────────────────────────────
    console.log('');
    answers.googleMapsKey = await input({
        message: 'Google Maps API key (leave empty to skip):',
        default: '',
    });

    // ── [7] Server-only: GitHub Actions ─────────────────────────────────
    if (mode === 'server') {
        console.log('');
        answers.setupGithub = await confirm({
            message: 'Set up GitHub Actions CI/CD secrets? (requires gh CLI)',
            default: false,
        });

        if (answers.setupGithub) {
            answers.repoOwner = await input({
                message: 'GitHub repository (owner/repo):',
                validate: (v) => v.trim() ? true : 'Required',
            });

            answers.sshHost = await input({
                message: 'Server IP or hostname for SSH:',
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

    return answers;
}

module.exports = { askQuestions };
