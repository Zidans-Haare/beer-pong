const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Returns a shell prefix that sources NVM if available, otherwise empty.
 * This makes shell commands work on both:
 *   - Servers where Node is installed via NVM
 *   - Local machines where Node is installed via brew/system
 */
function nvmPrefix() {
    const nvmSh = path.join(os.homedir(), '.nvm', 'nvm.sh');
    if (fs.existsSync(nvmSh)) {
        return `export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && `;
    }
    return '';
}

module.exports = { nvmPrefix };
