const { input, password, confirm, select } = require('@inquirer/prompts');
const os = require('os');
const path = require('path');
const { validateDomain, validateEmail, validatePort, validatePath } = require('./utils/validate');

/**
 * Stellt alle Wizard-Fragen und gibt ein Antworten-Objekt zurück.
 */
async function askQuestions() {
    const answers = {};
    const user = os.userInfo().username;
    const home = os.homedir();

    console.log('');

    // ── [1/7] Grundkonfiguration ─────────────────────────────────────
    answers.appName = await input({
        message: 'App-Name:',
        default: 'Bier Pong',
    });

    answers.domain = await input({
        message: 'Domain (z.B. bier.olomek.com):',
        validate: validateDomain,
    });

    answers.appPath = await input({
        message: 'App-Pfad (absoluter Pfad auf dem Server):',
        default: path.join(home, 'beer-pong'),
        validate: validatePath,
    });

    answers.port = await input({
        message: 'App-Port:',
        default: '3000',
        validate: validatePort,
    });

    answers.adminEmail = await input({
        message: 'Admin-Email:',
        validate: validateEmail,
    });

    // ── [2/7] Datenbank ──────────────────────────────────────────────
    console.log('');
    answers.dbBackup = await confirm({
        message: 'Wöchentliches DB-Backup per Cron einrichten?',
        default: true,
    });

    // ── [3/7] Email (Resend) ─────────────────────────────────────────
    console.log('');
    answers.resendApiKey = await input({
        message: 'Resend API-Key (leer lassen zum Überspringen):',
        default: '',
    });

    if (answers.resendApiKey) {
        answers.emailFrom = await input({
            message: 'Absender-Email:',
            default: `noreply@${answers.domain}`,
            validate: validateEmail,
        });
    } else {
        answers.emailFrom = `noreply@${answers.domain}`;
    }

    // ── [4/7] Push Notifications ─────────────────────────────────────
    console.log('');
    answers.generateVapid = await confirm({
        message: 'VAPID-Keys für Push-Benachrichtigungen generieren?',
        default: true,
    });

    // ── [5/7] Sentry ─────────────────────────────────────────────────
    console.log('');
    answers.sentryDsn = await input({
        message: 'Sentry DSN (leer lassen zum Überspringen):',
        default: '',
    });

    // ── [6/7] Google Maps ────────────────────────────────────────────
    console.log('');
    answers.googleMapsKey = await input({
        message: 'Google Maps API-Key (leer lassen zum Überspringen):',
        default: '',
    });

    // ── [7/7] Optionale Module ───────────────────────────────────────
    console.log('');
    answers.setupGithub = await confirm({
        message: 'GitHub Actions CI/CD einrichten? (gh CLI muss vorhanden sein)',
        default: false,
    });

    if (answers.setupGithub) {
        answers.repoOwner = await input({
            message: 'GitHub Repository (owner/repo):',
            default: `${user}/beer-pong`,
        });

        answers.sshHost = await input({
            message: 'Server-IP oder Hostname für SSH:',
            validate: (v) => v.trim() ? true : 'Pflichtfeld',
        });

        answers.sshUser = await input({
            message: 'SSH-Benutzer:',
            default: user,
        });

        answers.sshKeyPath = await input({
            message: 'Pfad zum SSH Private Key:',
            default: path.join(home, '.ssh', 'id_rsa'),
        });

        answers.e2eEmail = await input({
            message: 'E2E-Test-Email (existierender Benutzer):',
            default: answers.adminEmail,
            validate: validateEmail,
        });

        answers.e2ePassword = await password({
            message: 'E2E-Test-Passwort:',
            mask: '*',
        });
    }

    return answers;
}

module.exports = { askQuestions };
