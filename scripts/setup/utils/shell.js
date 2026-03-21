const { execFileSync, spawnSync } = require('child_process');

/**
 * Runs a command via execFileSync. Pass args as array to avoid shell injection.
 */
function run(args, opts = {}) {
    try {
        return execFileSync(args[0], args.slice(1), { encoding: 'utf-8', stdio: 'pipe', ...opts }).trim();
    } catch (err) {
        const stderr = err.stderr?.toString().trim() || '';
        throw new Error(`Command failed: ${args.join(' ')}\n${stderr || err.message}`);
    }
}

/**
 * Runs a shell expression via bash -c (for pipes, &&, etc.).
 * Only use with trusted/internal values — never with raw user input.
 */
function runShell(cmd, opts = {}) {
    try {
        return execFileSync('bash', ['-c', cmd], { encoding: 'utf-8', stdio: 'pipe', ...opts }).trim();
    } catch (err) {
        const stderr = err.stderr?.toString().trim() || '';
        throw new Error(`Shell command failed: ${cmd}\n${stderr || err.message}`);
    }
}

/**
 * Runs a command with stdio inherited (shows live output).
 */
function runInherit(args, opts = {}) {
    const result = spawnSync(args[0], args.slice(1), { stdio: 'inherit', ...opts });
    if (result.status !== 0) {
        throw new Error(`Command failed: ${args.join(' ')}`);
    }
}

/**
 * Checks whether a command exists in PATH.
 */
function commandExists(cmd) {
    try {
        execFileSync('bash', ['-c', `command -v ${cmd}`], { stdio: 'pipe' });
        return true;
    } catch {
        return false;
    }
}

module.exports = { run, runShell, runInherit, commandExists };
