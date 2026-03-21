const { runShell, commandExists } = require('../utils/shell');
const fs = require('fs');

/**
 * Sets GitHub Actions secrets via the gh CLI.
 */
function setupGithubSecrets(answers, spinner) {
    const { repoOwner, sshHost, sshUser, sshKeyPath, e2eEmail, e2ePassword } = answers;

    if (!commandExists('gh')) {
        throw new Error('gh CLI not found. Install from: https://cli.github.com');
    }

    spinner.text = 'Checking gh CLI authentication…';
    try {
        runShell('gh auth status');
    } catch {
        throw new Error('gh CLI is not logged in. Run "gh auth login" first.');
    }

    if (!fs.existsSync(sshKeyPath)) {
        throw new Error(`SSH private key not found: ${sshKeyPath}`);
    }
    const sshPrivateKey = fs.readFileSync(sshKeyPath, 'utf-8');

    const secrets = {
        SSH_HOST: sshHost,
        SSH_USER: sshUser,
        SSH_PRIVATE_KEY: sshPrivateKey,
        E2E_USER_EMAIL: e2eEmail,
        E2E_USER_PASSWORD: e2ePassword,
    };

    spinner.text = 'Setting GitHub secrets…';
    for (const [name, value] of Object.entries(secrets)) {
        if (!value) continue;
        // Pass value via stdin to avoid shell injection
        runShell(`echo ${JSON.stringify(value)} | gh secret set ${name} --repo "${repoOwner}"`);
        spinner.text = `Secret set: ${name}`;
    }
}

module.exports = { setupGithubSecrets };
