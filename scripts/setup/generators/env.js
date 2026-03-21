const { runShell } = require('../utils/shell');
const fs = require('fs');
const path = require('path');

/**
 * Generiert VAPID-Keys via web-push CLI.
 * Gibt { publicKey, privateKey } zurück.
 */
function generateVapidKeys(appPath) {
    try {
        const output = runShell(`cd "${appPath}" && npx web-push generate-vapid-keys --json`);
        return JSON.parse(output);
    } catch {
        // Fallback: manuell über web-push Modul
        const webpush = require('web-push');
        return webpush.generateVAPIDKeys();
    }
}

/**
 * Generiert einen zufälligen AUTH_SECRET.
 */
function generateAuthSecret() {
    try {
        return runShell('openssl rand -base64 32');
    } catch {
        // Fallback: crypto Modul
        return require('crypto').randomBytes(32).toString('base64');
    }
}

/**
 * Generiert die .env Datei aus den Wizard-Antworten.
 * Schreibt in appPath/.env
 */
async function generateEnv(answers, spinner) {
    const { appPath, domain, adminEmail, port } = answers;

    spinner.text = 'Generiere AUTH_SECRET…';
    const authSecret = generateAuthSecret();

    let vapidPublic = '';
    let vapidPrivate = '';
    if (answers.generateVapid) {
        spinner.text = 'Generiere VAPID-Keys…';
        const keys = generateVapidKeys(appPath);
        vapidPublic = keys.publicKey;
        vapidPrivate = keys.privateKey;
    }

    const dbPath = path.join(appPath, 'prisma', 'dev.db');
    const appUrl = `https://${domain}`;

    const lines = [
        '# Generiert vom Setup-Wizard',
        `# Datum: ${new Date().toLocaleString('de-DE')}`,
        '',
        '# Datenbank',
        `DATABASE_URL="file:${dbPath}"`,
        '',
        '# Auth',
        `AUTH_SECRET="${authSecret}"`,
        `ADMIN_EMAIL="${adminEmail}"`,
        '',
        '# App',
        `APP_URL="${appUrl}"`,
        `NEXT_PUBLIC_APP_URL="${appUrl}"`,
        `PORT=${port}`,
        '',
        '# WebAuthn (Passkeys)',
        `WEBAUTHN_RP_ID="${domain}"`,
        `WEBAUTHN_ORIGIN="${appUrl}"`,
        `WEBAUTHN_RP_NAME="${answers.appName}"`,
        '',
        '# Push Notifications (VAPID)',
        `NEXT_PUBLIC_VAPID_PUBLIC_KEY="${vapidPublic}"`,
        `VAPID_PRIVATE_KEY="${vapidPrivate}"`,
        `VAPID_CONTACT="mailto:${adminEmail}"`,
        '',
        '# Email (Resend)',
        `RESEND_API_KEY="${answers.resendApiKey || ''}"`,
        `EMAIL_FROM="${answers.emailFrom}"`,
        `ADMIN_EMAIL_CC=""`,
        '',
        '# Google Maps (optional)',
        `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="${answers.googleMapsKey || ''}"`,
        '',
        '# Sentry (optional)',
        `SENTRY_DSN="${answers.sentryDsn || ''}"`,
        `NEXT_PUBLIC_SENTRY_DSN="${answers.sentryDsn || ''}"`,
        '',
        '# Uptime Kuma (optional)',
        `UPTIME_KUMA_URL=""`,
        `UPTIME_KUMA_SLUG=""`,
        '',
        '# GitHub Repository (optional, für Easter Egg)',
        `NEXT_PUBLIC_GITHUB_REPO=""`,
    ];

    const envPath = path.join(appPath, '.env');
    fs.writeFileSync(envPath, lines.join('\n') + '\n', 'utf-8');
    spinner.text = `.env geschrieben → ${envPath}`;
    return envPath;
}

module.exports = { generateEnv };
