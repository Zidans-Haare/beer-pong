const { runShell, commandExists, isDryRun } = require('../utils/shell');
const path = require('path');
const fs = require('fs');

/**
 * Reads the repo URL from package.json "repository" field.
 * Falls back to git remote origin if available.
 */
function getRepoUrl() {
    try {
        // Walk up from cwd to find package.json (wizard may run from a temp npx dir)
        let dir = process.cwd();
        for (let i = 0; i < 5; i++) {
            const pkgPath = path.join(dir, 'package.json');
            if (fs.existsSync(pkgPath)) {
                const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
                const repo = pkg.repository;
                if (typeof repo === 'string') return repo.endsWith('.git') ? repo : repo + '.git';
                if (repo?.url) return repo.url.replace(/^git\+/, '');
            }
            dir = path.dirname(dir);
        }
    } catch { /* ignore */ }

    // Fallback: git remote
    try {
        return runShell('git remote get-url origin');
    } catch { /* ignore */ }

    throw new Error(
        'Could not determine repository URL.\n' +
        'Add a "repository" field to package.json or run from within the git repo.'
    );
}

/**
 * Clones the repo to appPath, or pulls if it already exists.
 */
function cloneOrPull(answers, spinner) {
    if (!commandExists('git')) {
        throw new Error('git is not installed. Run: sudo apt install git');
    }

    const repoUrl = getRepoUrl();
    const { appPath } = answers;

    if (isDryRun()) {
        process.stdout.write(`\x1b[2m    $ git clone "${repoUrl}" "${appPath}"\x1b[0m\n`);
        return;
    }

    if (fs.existsSync(path.join(appPath, '.git'))) {
        spinner.text = 'Repository already exists — pulling latest changes…';
        runShell(`cd "${appPath}" && git pull`);
    } else {
        spinner.text = `Cloning ${repoUrl}…`;
        runShell(`git clone "${repoUrl}" "${appPath}"`);
    }
}

module.exports = { cloneOrPull };
