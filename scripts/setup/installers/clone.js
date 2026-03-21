const { runShell, commandExists } = require('../utils/shell');
const fs = require('fs');

/**
 * Clones the git repository if the app directory doesn't exist yet.
 * If the directory already exists, pulls the latest changes instead.
 */
function cloneOrPull(answers, spinner) {
    const { repoUrl, appPath } = answers;

    if (!commandExists('git')) {
        throw new Error('git is not installed. Run: sudo apt install git');
    }

    if (fs.existsSync(appPath)) {
        spinner.text = `Directory ${appPath} already exists — pulling latest changes…`;
        runShell(`cd "${appPath}" && git pull`);
        spinner.text = 'Repository updated';
    } else {
        spinner.text = `Cloning ${repoUrl}…`;
        runShell(`git clone "${repoUrl}" "${appPath}"`);
        spinner.text = `Repository cloned → ${appPath}`;
    }
}

module.exports = { cloneOrPull };
