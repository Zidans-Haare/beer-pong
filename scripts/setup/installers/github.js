const { runShell, commandExists } = require('../utils/shell');
const fs = require('fs');

/**
 * Setzt GitHub Actions Secrets via gh CLI.
 */
function setupGithubSecrets(answers, spinner) {
    const { appPath, repoOwner, sshHost, sshUser, sshKeyPath, e2eEmail, e2ePassword } = answers;

    // gh CLI prüfen
    if (!commandExists('gh')) {
        throw new Error('gh CLI nicht gefunden. Installiere mit: https://cli.github.com');
    }

    // Auth-Status prüfen
    spinner.text = 'Prüfe gh CLI Authentifizierung…';
    try {
        runShell('gh auth status');
    } catch {
        throw new Error('gh CLI ist nicht eingeloggt. Führe zuerst "gh auth login" aus.');
    }

    // SSH Private Key lesen
    if (!fs.existsSync(sshKeyPath)) {
        throw new Error(`SSH Private Key nicht gefunden: ${sshKeyPath}`);
    }
    const sshPrivateKey = fs.readFileSync(sshKeyPath, 'utf-8');

    const secrets = {
        SSH_HOST: sshHost,
        SSH_USER: sshUser,
        SSH_PRIVATE_KEY: sshPrivateKey,
        E2E_USER_EMAIL: e2eEmail,
        E2E_USER_PASSWORD: e2ePassword,
    };

    spinner.text = 'Setze GitHub Secrets…';
    for (const [name, value] of Object.entries(secrets)) {
        if (!value) continue;
        // Wert via stdin übergeben um Shell-Injection zu vermeiden
        runShell(`echo ${JSON.stringify(value)} | gh secret set ${name} --repo "${repoOwner}"`);
        spinner.text = `Secret gesetzt: ${name}`;
    }

    spinner.text = `${Object.keys(secrets).length} GitHub Secrets erfolgreich gesetzt`;
}

module.exports = { setupGithubSecrets };
