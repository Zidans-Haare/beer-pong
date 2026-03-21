const { runShell, commandExists } = require('../utils/shell');
const path = require('path');
const fs = require('fs');

/**
 * Determines the repo URL from:
 *   1. package.json "repository" field
 *   2. git remote origin (if already inside a git repo)
 */
function getRepoUrl() {
    // Try package.json first
    try {
        const pkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf-8'));
        const repo = pkg.repository;
        if (typeof repo === 'string') return repo.endsWith('.git') ? repo : repo + '.git';
        if (repo?.url) return repo.url.replace(/^git\+/, '');
    } catch { /* ignore */ }

    // Fallback: read from git remote
    try {
        return runShell('git remote get-url origin');
    } catch { /* ignore */ }

    throw new Error('Could not determine repository URL. Add a "repository" field to package.json.');
}

/**
 * Clones the repo to ~/beer-pong (or pulls if it already exists).
 * Returns the resolved appPath.
 */
function cloneOrPull(answers, spinner) {
    if (!commandExists('git')) {
        throw new Error('git is not installed. Run: sudo apt install git');
    }

    const repoUrl = getRepoUrl();
    const { appPath } = answers;

    if (fs.existsSync(path.join(appPath, '.git'))) {
        spinner.text = 'Repository already exists — pulling latest changes…';
        runShell(`cd "${appPath}" && git pull`);
    } else {
        spinner.text = `Cloning ${repoUrl}…`;
        runShell(`git clone "${repoUrl}" "${appPath}"`);
    }

    spinner.text = `Repository ready → ${appPath}`;
}

module.exports = { cloneOrPull, getRepoUrl };
