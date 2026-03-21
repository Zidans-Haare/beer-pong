const { execFileSync, spawnSync } = require('child_process');

/**
 * Führt einen Shell-Befehl via execFileSync aus.
 * Für Befehle mit Shell-Features (Pipes, &&) wird bash verwendet.
 * @param {string[]} args - Array mit Befehl + Argumenten (kein Shell-Injection-Risiko)
 * @returns {string} stdout
 */
function run(args, opts = {}) {
    try {
        return execFileSync(args[0], args.slice(1), { encoding: 'utf-8', stdio: 'pipe', ...opts }).trim();
    } catch (err) {
        const stderr = err.stderr?.toString().trim() || '';
        const msg = stderr || err.message;
        throw new Error(`Befehl fehlgeschlagen: ${args.join(' ')}\n${msg}`);
    }
}

/**
 * Führt einen Shell-Ausdruck via bash -c aus (für Befehle die Shell-Features benötigen).
 * ACHTUNG: Nur mit geprüften/internen Werten verwenden, nie mit roher Nutzereingabe.
 * @param {string} cmd - Shell-Befehl
 */
function runShell(cmd, opts = {}) {
    try {
        return execFileSync('bash', ['-c', cmd], { encoding: 'utf-8', stdio: 'pipe', ...opts }).trim();
    } catch (err) {
        const stderr = err.stderr?.toString().trim() || '';
        const msg = stderr || err.message;
        throw new Error(`Shell-Befehl fehlgeschlagen: ${cmd}\n${msg}`);
    }
}

/**
 * Führt einen Befehl aus und leitet Ein-/Ausgabe direkt ins Terminal.
 * Nützlich für lange laufende Befehle wie npm-Installationen.
 */
function runInherit(args, opts = {}) {
    const result = spawnSync(args[0], args.slice(1), { stdio: 'inherit', ...opts });
    if (result.status !== 0) {
        throw new Error(`Befehl fehlgeschlagen: ${args.join(' ')}`);
    }
}

/**
 * Prüft ob ein Befehl im PATH vorhanden ist.
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
