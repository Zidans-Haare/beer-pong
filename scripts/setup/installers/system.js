const { runShell, commandExists, isDryRun } = require('../utils/shell');
const os = require('os');

/**
 * Checks and installs required system dependencies for server mode.
 * - Node/NVM: installed via NVM if missing
 * - npm: comes with Node
 * - git: installed via apt if missing
 * - nginx: installed via apt if missing
 * - certbot: installed via apt if missing
 * - pm2: installed via npm if missing
 * - gh CLI: cannot be auto-installed, user is informed
 */
async function checkSystemDeps(answers, spinner) {
    if (os.platform() !== 'linux') {
        spinner.warn('System dependency check only runs on Linux — skipping.');
        return;
    }

    const missing = [];
    const toInstallApt = [];
    const toInstallNpm = [];

    // ── Node / NVM ────────────────────────────────────────────────────────
    if (!commandExists('node')) {
        missing.push('Node.js');
        spinner.text = 'Installing Node.js via NVM…';
        if (!isDryRun()) {
            runShell(
                'curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash && ' +
                'export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && ' +
                'nvm install 20 && nvm alias default 20'
            );
        } else {
            process.stdout.write('\x1b[2m    $ curl -o- https://nvm.sh/install.sh | bash && nvm install 20\x1b[0m\n');
        }
    }

    // ── git ───────────────────────────────────────────────────────────────
    if (!commandExists('git')) {
        missing.push('git');
        toInstallApt.push('git');
    }

    // ── sqlite3 CLI ───────────────────────────────────────────────────────
    if (!commandExists('sqlite3')) {
        missing.push('sqlite3');
        toInstallApt.push('sqlite3');
    }

    // ── nginx ─────────────────────────────────────────────────────────────
    if (!commandExists('nginx')) {
        missing.push('nginx');
        toInstallApt.push('nginx');
    }

    // ── certbot ───────────────────────────────────────────────────────────
    if (!commandExists('certbot')) {
        missing.push('certbot');
        toInstallApt.push('certbot python3-certbot-nginx');
    }

    // ── PM2 ───────────────────────────────────────────────────────────────
    if (!commandExists('pm2')) {
        missing.push('pm2');
        toInstallNpm.push('pm2');
    }

    // ── Install via apt ───────────────────────────────────────────────────
    if (toInstallApt.length > 0) {
        spinner.text = `Installing via apt: ${toInstallApt.join(', ')}…`;
        runShell(`sudo apt-get update -qq && sudo apt-get install -y ${toInstallApt.join(' ')}`);
    }

    // ── Install via npm ───────────────────────────────────────────────────
    if (toInstallNpm.length > 0) {
        spinner.text = `Installing via npm: ${toInstallNpm.join(', ')}…`;
        const nvm = require('../utils/nvm').nvmPrefix();
        runShell(`${nvm}npm install -g ${toInstallNpm.join(' ')}`);
    }

    // ── gh CLI: cannot auto-install, just inform ──────────────────────────
    if (answers.setupGithub && !commandExists('gh')) {
        spinner.warn(
            'gh CLI not found — GitHub secrets step will be skipped.\n' +
            '      Install manually: https://cli.github.com'
        );
        answers.setupGithub = false; // disable that step
    }

    if (missing.length > 0) {
        spinner.text = `Installed: ${missing.join(', ')}`;
    }
}

module.exports = { checkSystemDeps };
