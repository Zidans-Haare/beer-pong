const { execFileSync, spawnSync } = require('child_process');

// When true, all shell commands are printed but not executed
let DRY_RUN = false;

function setDryRun(val) { DRY_RUN = val; }
function isDryRun() { return DRY_RUN; }

function dryLog(cmd) {
    process.stdout.write('\x1b[2m    $ ' + cmd + '\x1b[0m\n');
}

/**
 * Runs a command via execFileSync. Pass args as array to avoid shell injection.
 */
function run(args, opts = {}) {
    if (DRY_RUN) { dryLog(args.join(' ')); return ''; }
    try {
        return execFileSync(args[0], args.slice(1), { encoding: 'utf-8', stdio: 'pipe', ...opts }).trim();
    } catch (err) {
        const stderr = err.stderr?.toString().trim() || '';
        throw new Error(`Command failed: ${args.join(' ')}\n${stderr || err.message}`);
    }
}

/**
 * Runs a shell expression via bash -c.
 * Only use with trusted/internal values — never with raw user input.
 */
function runShell(cmd, opts = {}) {
    if (DRY_RUN) { dryLog(cmd); return ''; }
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
    if (DRY_RUN) { dryLog(args.join(' ')); return; }
    const result = spawnSync(args[0], args.slice(1), { stdio: 'inherit', ...opts });
    if (result.status !== 0) {
        throw new Error(`Command failed: ${args.join(' ')}`);
    }
}

/**
 * Checks whether a command exists in PATH.
 * In dry-run mode always returns true so steps aren't skipped.
 */
function commandExists(cmd) {
    if (DRY_RUN) return true;
    try {
        execFileSync('bash', ['-c', `command -v ${cmd}`], { stdio: 'pipe' });
        return true;
    } catch {
        return false;
    }
}

module.exports = { run, runShell, runInherit, commandExists, setDryRun, isDryRun };
